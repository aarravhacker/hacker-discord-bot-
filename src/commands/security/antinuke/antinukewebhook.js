const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { addSecurityLog } = require('../../../db/securityRepository');
const securityEngine = require('../../../utils/securityEngine');
const logger = require('../../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukewebhook')
    .setDescription('Detect and prevent webhook abuse')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('enable').setDescription('Enable webhook protection'))
    .addSubcommand(sub =>
      sub.setName('disable').setDescription('Disable webhook protection'))
    .addSubcommand(sub =>
      sub.setName('scan').setDescription('Scan for suspicious webhooks'))
    .addSubcommand(sub =>
      sub.setName('delete')
        .setDescription('Delete a suspicious webhook')
        .addStringOption(opt => opt.setName('webhook_id').setDescription('Webhook ID to delete').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('whitelist')
        .setDescription('Whitelist a webhook')
        .addStringOption(opt => opt.setName('webhook_id').setDescription('Webhook ID to whitelist').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('status').setDescription('View webhook protection status')),

  cooldown: 5,
  aliases: ['awebhook', 'webhookguard'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permission.', ephemeral: true });
    }

    const subcommand = isSlash ? interaction.options.getSubcommand() : (args[0] || 'status').toLowerCase();
    const guildData = await getGuild(interaction.guild.id);

    if (subcommand === 'enable') {
      const config = JSON.parse(guildData.antinuke_config || '{}');
      config.webhookProtection = true;
      await updateGuild(interaction.guild.id, { antinuke_config: JSON.stringify(config) });
      await addSecurityLog({ guild_id: interaction.guild.id, user_id: user.id, action: 'webhook_protection_enabled', type: 'antinuke', details: '{}' });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription('Webhook protection enabled. All webhook creation/deletion will be monitored.')] });
    }

    if (subcommand === 'disable') {
      const config = JSON.parse(guildData.antinuke_config || '{}');
      config.webhookProtection = false;
      await updateGuild(interaction.guild.id, { antinuke_config: JSON.stringify(config) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('Webhook protection disabled.')] });
    }

    if (subcommand === 'scan') {
      await interaction.deferReply();
      const webhooks = await interaction.guild.fetchWebhooks();
      const suspicious = [];
      const normal = [];

      for (const [, webhook] of webhooks) {
        const age = Date.now() - (webhook.createdTimestamp || 0);
        const isRecent = age < 86400000;
        const hasPerms = webhook.token && webhook.token.length > 0;
        const creator = webhook.owner?.tag || 'Unknown';

        if (isRecent || creator === 'Unknown') {
          suspicious.push({ id: webhook.id, name: webhook.name, channel: webhook.channel?.name || 'deleted', creator, age: Math.floor(age / 3600000) + 'h' });
        } else {
          normal.push(webhook);
        }
      }

      const embed = new EmbedBuilder()
        .setColor(suspicious.length > 0 ? 0xff8800 : 0x00ff00)
        .setTitle('Webhook Scan Results')
        .setDescription(`Scanned **${webhooks.size}** webhooks in **${interaction.guild.name}**`)
        .addFields(
          { name: 'Total Webhooks', value: `${webhooks.size}`, inline: true },
          { name: 'Suspicious', value: `${suspicious.length}`, inline: true },
          { name: 'Normal', value: `${normal.length}`, inline: true }
        )
        .setTimestamp();

      if (suspicious.length > 0) {
        const list = suspicious.slice(0, 10).map(w => `\`${w.id}\` **${w.name}** in #${w.channel} by ${w.creator} (${w.age} ago)`).join('\n');
        embed.addFields({ name: 'Suspicious Webhooks', value: list });
      }

      embed.setFooter({ text: `Requested by ${user.tag}` });
      return interaction.editReply({ embeds: [embed] });
    }

    if (subcommand === 'delete') {
      const webhookId = isSlash ? interaction.options.getString('webhook_id') : args[0];
      if (!webhookId) return interaction.reply({ content: 'Provide a webhook ID.', ephemeral: true });

      try {
        const webhook = await interaction.guild.fetchWebhook(webhookId);
        await webhook.delete(`Deleted by ${user.tag} via antinuke webhook protection`);
        await addSecurityLog({ guild_id: interaction.guild.id, user_id: user.id, action: 'webhook_deleted', type: 'antinuke', details: JSON.stringify({ webhookId, name: webhook.name }) });
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription(`Webhook **${webhook.name}** deleted.`)] });
      } catch (e) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription(`Failed to delete webhook: ${e.message}`)] });
      }
    }

    if (subcommand === 'whitelist') {
      const webhookId = isSlash ? interaction.options.getString('webhook_id') : args[0];
      if (!webhookId) return interaction.reply({ content: 'Provide a webhook ID.', ephemeral: true });
      const config = JSON.parse(guildData.antinuke_config || '{}');
      if (!config.webhookWhitelist) config.webhookWhitelist = [];
      if (!config.webhookWhitelist.includes(webhookId)) config.webhookWhitelist.push(webhookId);
      await updateGuild(interaction.guild.id, { antinuke_config: JSON.stringify(config) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription(`Webhook \`${webhookId}\` whitelisted.`)] });
    }

    if (subcommand === 'status') {
      const config = JSON.parse(guildData.antinuke_config || '{}');
      const enabled = config.webhookProtection || false;
      const whitelist = config.webhookWhitelist || [];
      const webhooks = await interaction.guild.fetchWebhooks();
      return interaction.reply({ embeds: [new EmbedBuilder()
        .setColor(enabled ? 0x00ff00 : 0xff0000)
        .setTitle('Webhook Protection Status')
        .addFields(
          { name: 'Protection', value: enabled ? 'Enabled' : 'Disabled', inline: true },
          { name: 'Total Webhooks', value: `${webhooks.size}`, inline: true },
          { name: 'Whitelisted', value: `${whitelist.length}`, inline: true }
        )
        .setTimestamp()
      ] });
    }
  }
};
