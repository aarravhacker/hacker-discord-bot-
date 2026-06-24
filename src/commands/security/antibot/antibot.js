const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { addSecurityLog } = require('../../../db/securityRepository');
const { successEmbed, errorEmbed, infoEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antibot')
    .setDescription('Complete antibot protection system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('enable').setDescription('Enable antibot protection'))
    .addSubcommand(sub => sub.setName('disable').setDescription('Disable antibot protection'))
    .addSubcommand(sub => sub.setName('status').setDescription('View antibot status'))
    .addSubcommand(sub => sub.setName('setup').setDescription('Quick setup with defaults'))
    .addSubcommand(sub => sub.setName('action').setDescription('Set antibot action')
      .addStringOption(opt => opt.setName('type').setDescription('Action to take').setRequired(true)
        .addChoices(
          { name: 'kick', value: 'kick' },
          { name: 'ban', value: 'ban' }
        ))),

  cooldown: 5,
  aliases: ['ab', 'botguard'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;
    const user = isSlash ? interaction.user : interaction.author;
    const member = isSlash ? interaction.member : guild.members.cache.get(user.id);
    const reply = (opts) => isSlash ? interaction.reply(opts) : interaction.channel.send(opts);

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      return reply({ embeds: [errorEmbed('Permission Denied', 'You need Administrator permission.')] });
    }

    try {
      let subcommand;
      if (isSlash) {
        subcommand = interaction.options.getSubcommand();
      } else {
        const raw = (args?.[0] || '').toLowerCase();
        if (['enable', 'disable', 'status', 'setup', 'action'].includes(raw)) {
          subcommand = raw;
        } else {
          subcommand = 'status';
        }
      }

      const guildData = await getGuild(guild.id);

      if (subcommand === 'enable') {
        await updateGuild(guild.id, { antibot_enabled: true });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antibot_enabled', type: 'antibot', details: '{}' });
        return reply({ embeds: [successEmbed('Antibot Enabled', 'Antibot protection is now **enabled**.')] });
      }

      if (subcommand === 'disable') {
        await updateGuild(guild.id, { antibot_enabled: false });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antibot_disabled', type: 'antibot', details: '{}' });
        return reply({ embeds: [errorEmbed('Antibot Disabled', 'Antibot protection is now **disabled**.')] });
      }

      if (subcommand === 'status') {
        const enabled = guildData.antibot_enabled;
        const abConfig = JSON.parse(guildData.antibot_config || '{}');
        const embed = infoEmbed('Antibot Status', `Status for **${guild.name}**`);
        embed.addFields(
          { name: 'Protection', value: enabled ? 'Enabled' : 'Disabled', inline: true },
          { name: 'Action', value: (abConfig.action || 'kick').toUpperCase(), inline: true }
        );
        return reply({ embeds: [embed] });
      }

      if (subcommand === 'setup') {
        await updateGuild(guild.id, {
          antibot_enabled: true,
          antibot_config: JSON.stringify({ action: 'kick' })
        });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antibot_setup', type: 'antibot', details: '{}' });
        return reply({ embeds: [successEmbed('Antibot Setup Complete', [
          'Protection: Enabled',
          'Action: Kick'
        ].join('\n'))] });
      }

      if (subcommand === 'action') {
        const type = isSlash ? interaction.options.getString('type') : (args?.[1] || 'kick').toLowerCase();
        if (!['kick', 'ban'].includes(type)) {
          return reply({ embeds: [errorEmbed('Error', 'Valid actions: kick, ban')] });
        }
        let abConfig = JSON.parse(guildData.antibot_config || '{}');
        abConfig.action = type;
        await updateGuild(guild.id, { antibot_config: JSON.stringify(abConfig) });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antibot_action_set', type: 'antibot', details: JSON.stringify({ action: type }) });
        return reply({ embeds: [successEmbed('Action Set', `Antibot action set to **${type}**.`)] });
      }

    } catch (error) {
      console.error(error);
      return reply({ embeds: [errorEmbed('Error', `Failed: ${error.message}`)] });
    }
  }
};