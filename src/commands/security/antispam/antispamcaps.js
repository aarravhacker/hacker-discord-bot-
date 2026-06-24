const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { addSecurityLog } = require('../../../db/securityRepository');
const logger = require('../../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antispamcaps')
    .setDescription('Configure caps lock spam detection')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('config')
        .setDescription('Configure caps settings')
        .addIntegerOption(opt => opt.setName('percent').setDescription('Minimum caps percentage (60-100)').setMinValue(60).setMaxValue(100))
        .addIntegerOption(opt => opt.setName('length').setDescription('Minimum message length (5-200)').setMinValue(5).setMaxValue(200))
        .addStringOption(opt => opt.setName('action').setDescription('Action to take')
          .addChoices({ name: 'Delete', value: 'delete' }, { name: 'Warn', value: 'warn' }, { name: 'Mute', value: 'mute' })))
    .addSubcommand(sub =>
      sub.setName('test').setDescription('Test caps detection on a message')
        .addStringOption(opt => opt.setName('message').setDescription('Message to test').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('ignore')
        .setDescription('Add channel or role to caps ignore list')
        .addStringOption(opt => opt.setName('type').setDescription('Type to ignore').setRequired(true)
          .addChoices({ name: 'Channel', value: 'channel' }, { name: 'Role', value: 'role' }))
        .addStringOption(opt => opt.setName('id').setDescription('Channel/Role ID').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('unignore')
        .setDescription('Remove channel or role from caps ignore list')
        .addStringOption(opt => opt.setName('type').setDescription('Type to remove').setRequired(true)
          .addChoices({ name: 'Channel', value: 'channel' }, { name: 'Role', value: 'role' }))
        .addStringOption(opt => opt.setName('id').setDescription('Channel/Role ID').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('stats').setDescription('View caps settings')),

  cooldown: 5,
  aliases: ['ascaps', 'capsspam'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permission.', ephemeral: true });
    }

    const subcommand = isSlash ? interaction.options.getSubcommand() : (args[0] || 'stats').toLowerCase();
    const guildData = await getGuild(interaction.guild.id);
    const config = JSON.parse(guildData.antispam_config || '{}');

    if (!config.caps) {
      config.caps = { percent: 70, minLength: 20, action: 'delete', ignoredChannels: [], ignoredRoles: [] };
    }

    if (subcommand === 'config') {
      const percent = isSlash ? interaction.options.getInteger('percent') : parseInt(args[0]);
      const length = isSlash ? interaction.options.getInteger('length') : parseInt(args[1]);
      const action = isSlash ? interaction.options.getString('action') : args[2];

      if (percent) config.caps.percent = percent;
      if (length) config.caps.minLength = length;
      if (action) config.caps.action = action;

      await updateGuild(interaction.guild.id, { antispam_config: JSON.stringify(config) });
      await addSecurityLog({ guild_id: interaction.guild.id, user_id: user.id, action: 'caps_config_updated', type: 'antispam', details: JSON.stringify(config.caps) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription(`Caps settings: **${config.caps.percent}%+** caps (min ${config.caps.minLength} chars) → **${config.caps.action}**`).setTimestamp()] });
    }

    if (subcommand === 'test') {
      const text = isSlash ? interaction.options.getString('message') : args.join(' ');
      if (!text) return interaction.reply({ content: 'Provide a message to test.', ephemeral: true });

      const letters = text.replace(/[^a-zA-Z]/g, '');
      const upper = text.replace(/[^A-Z]/g, '');
      const capsPercent = letters.length > 0 ? Math.round((upper.length / letters.length) * 100) : 0;
      const passesLength = text.length >= config.caps.minLength;
      const wouldTrigger = capsPercent >= config.caps.percent && passesLength && text.length > 0;

      const embed = new EmbedBuilder()
        .setColor(wouldTrigger ? 0xff0000 : 0x00ff00)
        .setTitle('Caps Detection Test')
        .addFields(
          { name: 'Letters', value: `${letters.length}`, inline: true },
          { name: 'Uppercase', value: `${upper.length}`, inline: true },
          { name: 'Caps %', value: `${capsPercent}%`, inline: true },
          { name: 'Min Length', value: `${config.caps.minLength}`, inline: true },
          { name: 'Threshold', value: `${config.caps.percent}%`, inline: true },
          { name: 'Would Trigger', value: wouldTrigger ? 'Yes' : 'No', inline: true }
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'ignore') {
      const type = isSlash ? interaction.options.getString('type') : args[0];
      const id = isSlash ? interaction.options.getString('id') : args[1];
      if (!type || !id) return interaction.reply({ content: 'Provide type and ID.', ephemeral: true });
      const list = type === 'channel' ? config.caps.ignoredChannels : config.caps.ignoredRoles;
      if (!list.includes(id)) list.push(id);
      await updateGuild(interaction.guild.id, { antispam_config: JSON.stringify(config) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription(`Added **${id}** to caps ${type} ignore list.`)] });
    }

    if (subcommand === 'unignore') {
      const type = isSlash ? interaction.options.getString('type') : args[0];
      const id = isSlash ? interaction.options.getString('id') : args[1];
      if (!type || !id) return interaction.reply({ content: 'Provide type and ID.', ephemeral: true });
      const list = type === 'channel' ? config.caps.ignoredChannels : config.caps.ignoredRoles;
      const idx = list.indexOf(id);
      if (idx > -1) list.splice(idx, 1);
      await updateGuild(interaction.guild.id, { antispam_config: JSON.stringify(config) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription(`Removed **${id}** from caps ${type} ignore list.`)] });
    }

    if (subcommand === 'stats') {
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('Caps Spam Settings')
        .addFields(
          { name: 'Threshold', value: `${config.caps.percent}%`, inline: true },
          { name: 'Min Length', value: `${config.caps.minLength} chars`, inline: true },
          { name: 'Action', value: config.caps.action, inline: true },
          { name: 'Ignored Channels', value: `${config.caps.ignoredChannels.length}`, inline: true },
          { name: 'Ignored Roles', value: `${config.caps.ignoredRoles.length}`, inline: true }
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  }
};
