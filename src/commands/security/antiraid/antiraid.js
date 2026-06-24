const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { addSecurityLog } = require('../../../db/securityRepository');
const { successEmbed, errorEmbed, infoEmbed } = require('../../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antiraid')
    .setDescription('Complete antiraid protection system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('enable').setDescription('Enable antiraid protection'))
    .addSubcommand(sub => sub.setName('disable').setDescription('Disable antiraid protection'))
    .addSubcommand(sub => sub.setName('status').setDescription('View antiraid status'))
    .addSubcommand(sub => sub.setName('setup').setDescription('Quick setup with defaults'))
    .addSubcommand(sub => sub.setName('action').setDescription('Set raid action')
      .addStringOption(opt => opt.setName('type').setDescription('Action to take').setRequired(true)
        .addChoices(
          { name: 'kick', value: 'kick' },
          { name: 'ban', value: 'ban' },
          { name: 'timeout', value: 'timeout' }
        )))
    .addSubcommand(sub => sub.setName('threshold').setDescription('Set join threshold')
      .addIntegerOption(opt => opt.setName('count').setDescription('Max joins in window').setRequired(true).setMinValue(2).setMaxValue(50))
      .addIntegerOption(opt => opt.setName('seconds').setDescription('Time window in seconds').setRequired(true).setMinValue(5).setMaxValue(300))),

  cooldown: 5,
  aliases: ['ar', 'raidshield'],
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
        if (['enable', 'disable', 'status', 'setup', 'action', 'threshold'].includes(raw)) {
          subcommand = raw;
        } else {
          subcommand = 'status';
        }
      }

      const guildData = await getGuild(guild.id);

      if (subcommand === 'enable') {
        await updateGuild(guild.id, { antiraid_enabled: true });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antiraid_enabled', type: 'antiraid', details: '{}' });
        return reply({ embeds: [successEmbed('Antiraid Enabled', 'Antiraid protection is now **enabled**.')] });
      }

      if (subcommand === 'disable') {
        await updateGuild(guild.id, { antiraid_enabled: false });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antiraid_disabled', type: 'antiraid', details: '{}' });
        return reply({ embeds: [errorEmbed('Antiraid Disabled', 'Antiraid protection is now **disabled**.')] });
      }

      if (subcommand === 'status') {
        const enabled = guildData.antiraid_enabled;
        const arConfig = JSON.parse(guildData.antiraid_config || '{}');
        const embed = infoEmbed('Antiraid Status', `Status for **${guild.name}**`);
        embed.addFields(
          { name: 'Protection', value: enabled ? 'Enabled' : 'Disabled', inline: true },
          { name: 'Join Threshold', value: `${arConfig.joinThreshold || 5} joins`, inline: true },
          { name: 'Time Window', value: `${arConfig.timeWindow || 10}s`, inline: true },
          { name: 'Action', value: (arConfig.action || 'kick').toUpperCase(), inline: true }
        );
        return reply({ embeds: [embed] });
      }

      if (subcommand === 'setup') {
        await updateGuild(guild.id, {
          antiraid_enabled: true,
          antiraid_config: JSON.stringify({ joinThreshold: 5, timeWindow: 10, action: 'kick' })
        });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antiraid_setup', type: 'antiraid', details: '{}' });
        return reply({ embeds: [successEmbed('Antiraid Setup Complete', [
          'Protection: Enabled',
          'Join Threshold: 5 joins / 10s',
          'Action: Kick'
        ].join('\n'))] });
      }

      if (subcommand === 'action') {
        const type = isSlash ? interaction.options.getString('type') : (args?.[1] || 'kick').toLowerCase();
        if (!['kick', 'ban', 'timeout'].includes(type)) {
          return reply({ embeds: [errorEmbed('Error', 'Valid actions: kick, ban, timeout')] });
        }
        let arConfig = JSON.parse(guildData.antiraid_config || '{}');
        arConfig.action = type;
        await updateGuild(guild.id, { antiraid_config: JSON.stringify(arConfig) });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antiraid_action_set', type: 'antiraid', details: JSON.stringify({ action: type }) });
        return reply({ embeds: [successEmbed('Action Set', `Antiraid action set to **${type}**.`)] });
      }

      if (subcommand === 'threshold') {
        const count = isSlash ? interaction.options.getInteger('count') : parseInt(args?.[1]);
        const seconds = isSlash ? interaction.options.getInteger('seconds') : parseInt(args?.[2]);
        if (!count || !seconds || isNaN(count) || isNaN(seconds)) {
          return reply({ embeds: [errorEmbed('Error', 'Provide valid count and seconds.')] });
        }
        let arConfig = JSON.parse(guildData.antiraid_config || '{}');
        arConfig.joinThreshold = count;
        arConfig.timeWindow = seconds;
        await updateGuild(guild.id, { antiraid_config: JSON.stringify(arConfig) });
        await addSecurityLog({ guild_id: guild.id, user_id: user.id, action: 'antiraid_threshold_set', type: 'antiraid', details: JSON.stringify({ count, seconds }) });
        return reply({ embeds: [successEmbed('Threshold Set', `Join threshold: **${count}** joins in **${seconds}s**`)] });
      }

    } catch (error) {
      console.error(error);
      return reply({ embeds: [errorEmbed('Error', `Failed: ${error.message}`)] });
    }
  }
};