const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { embedColors } = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antispamconfig')
    .setDescription('Configure anti-spam thresholds')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt =>
      opt.setName('messages').setDescription('Message count threshold (2-20)').setRequired(false)
        .setMinValue(2).setMaxValue(20)
    )
    .addIntegerOption(opt =>
      opt.setName('time').setDescription('Time window in seconds (1-60)').setRequired(false)
        .setMinValue(1).setMaxValue(60)
    )
    .addIntegerOption(opt =>
      opt.setName('duplicates').setDescription('Duplicate message threshold (2-10)').setRequired(false)
        .setMinValue(2).setMaxValue(10)
    )
    .addIntegerOption(opt =>
      opt.setName('links').setDescription('Link count threshold (2-10)').setRequired(false)
        .setMinValue(2).setMaxValue(10)
    )
    .addIntegerOption(opt =>
      opt.setName('mentions').setDescription('Mention count threshold (2-15)').setRequired(false)
        .setMinValue(2).setMaxValue(15)
    ),
  cooldown: 3,
  aliases: ['antispamcfg', 'asconfig'],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;
    try {
      const record = await getDB()('automod')
        .where({ guild_id: interaction.guild.id, type: 'antispam' })
        .first();

      const config = record
        ? JSON.parse(record.config)
        : {
          messageThreshold: 5, timeWindow: 10, duplicateThreshold: 3,
          linkThreshold: 3, mentionThreshold: 5, action: 'warn',
          logChannel: null, ignoredRoles: [], ignoredChannels: []
        };

      if (args?.[0]) config.messageThreshold = parseInt(args[0]) || config.messageThreshold;
      if (args?.[1]) config.timeWindow = parseInt(args[1]) || config.timeWindow;
      if (args?.[2]) config.duplicateThreshold = parseInt(args[2]) || config.duplicateThreshold;
      if (args?.[3]) config.linkThreshold = parseInt(args[3]) || config.linkThreshold;
      if (args?.[4]) config.mentionThreshold = parseInt(args[4]) || config.mentionThreshold;

      if (interaction.options) {
        const msgs = interaction.options?.getInteger('messages');
        const time = interaction.options?.getInteger('time');
        const dups = interaction.options?.getInteger('duplicates');
        const links = interaction.options?.getInteger('links');
        const mentions = interaction.options?.getInteger('mentions');
        if (msgs) config.messageThreshold = msgs;
        if (time) config.timeWindow = time;
        if (dups) config.duplicateThreshold = dups;
        if (links) config.linkThreshold = links;
        if (mentions) config.mentionThreshold = mentions;
      }

      if (record) {
        await getDB()('automod')
          .where({ guild_id: interaction.guild.id, type: 'antispam' })
          .update({ config: JSON.stringify(config), enabled: true });
      } else {
        await getDB()('automod').insert({
          guild_id: interaction.guild.id,
          type: 'antispam',
          config: JSON.stringify(config),
          enabled: true
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('Anti-Spam Configuration')
        .setDescription([
          `**Messages:** ${config.messageThreshold} in ${config.timeWindow}s`,
          `**Duplicates:** ${config.duplicateThreshold}`,
          `**Links:** ${config.linkThreshold}`,
          `**Mentions:** ${config.mentionThreshold}`
        ].join('\n'))
        .setColor(embedColors.success)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to configure anti-spam.')] });
    }
  }
};
