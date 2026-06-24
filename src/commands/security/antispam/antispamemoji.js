const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild, updateGuild } = require('../../../db/guildRepository');
const { addSecurityLog } = require('../../../db/securityRepository');
const logger = require('../../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antispamemoji')
    .setDescription('Configure emoji spam detection')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('config')
        .setDescription('Configure emoji spam settings')
        .addIntegerOption(opt => opt.setName('threshold').setDescription('Emojis to trigger (3-100)').setMinValue(3).setMaxValue(100))
        .addBooleanOption(opt => opt.setName('unicode').setDescription('Check Unicode emojis'))
        .addBooleanOption(opt => opt.setName('custom').setDescription('Check custom emojis'))
        .addBooleanOption(opt => opt.setName('mixed').setDescription('Check mixed emoji+text'))
        .addStringOption(opt => opt.setName('action').setDescription('Action to take')
          .addChoices({ name: 'Delete', value: 'delete' }, { name: 'Mute', value: 'mute' }, { name: 'Warn', value: 'warn' })))
    .addSubcommand(sub =>
      sub.setName('test').setDescription('Test emoji detection on a message')
        .addStringOption(opt => opt.setName('message').setDescription('Message to test').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('whitelist')
        .setDescription('Whitelist an emoji from detection')
        .addStringOption(opt => opt.setName('emoji').setDescription('Emoji to whitelist (custom emoji or Unicode)').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('unwhitelist')
        .setDescription('Remove emoji from whitelist')
        .addStringOption(opt => opt.setName('emoji').setDescription('Emoji to unwhitelist').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('stats').setDescription('View emoji usage statistics')),

  cooldown: 5,
  aliases: ['asemoji', 'emojispam'],
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

    if (!config.emoji) {
      config.emoji = { threshold: 10, unicode: true, custom: true, mixed: false, action: 'delete', whitelist: [] };
    }

    if (subcommand === 'config') {
      const threshold = isSlash ? interaction.options.getInteger('threshold') : parseInt(args[0]);
      const unicode = isSlash ? interaction.options.getBoolean('unicode') : undefined;
      const custom = isSlash ? interaction.options.getBoolean('custom') : undefined;
      const mixed = isSlash ? interaction.options.getBoolean('mixed') : undefined;
      const action = isSlash ? interaction.options.getString('action') : args[1];

      if (threshold) config.emoji.threshold = threshold;
      if (unicode !== undefined) config.emoji.unicode = unicode;
      if (custom !== undefined) config.emoji.custom = custom;
      if (mixed !== undefined) config.emoji.mixed = mixed;
      if (action) config.emoji.action = action;

      await updateGuild(interaction.guild.id, { antispam_config: JSON.stringify(config) });
      await addSecurityLog({ guild_id: interaction.guild.id, user_id: user.id, action: 'emoji_config_updated', type: 'antispam', details: JSON.stringify(config.emoji) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription(`Emoji settings: **${config.emoji.threshold}** emojis → **${config.emoji.action}**`).setTimestamp()] });
    }

    if (subcommand === 'test') {
      const text = isSlash ? interaction.options.getString('message') : args.join(' ');
      if (!text) return interaction.reply({ content: 'Provide a message to test.', ephemeral: true });

      const customEmojiRegex = /<a?:\w+:\d+>/g;
      const unicodeEmojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu;

      const customEmojis = text.match(customEmojiRegex) || [];
      const unicodeEmojis = text.match(unicodeEmojiRegex) || [];
      const total = customEmojis.length + unicodeEmojis.length;
      const wouldTrigger = total >= config.emoji.threshold;

      const embed = new EmbedBuilder()
        .setColor(wouldTrigger ? 0xff0000 : 0x00ff00)
        .setTitle('Emoji Detection Test')
        .addFields(
          { name: 'Custom Emojis', value: `${customEmojis.length}`, inline: true },
          { name: 'Unicode Emojis', value: `${unicodeEmojis.length}`, inline: true },
          { name: 'Total', value: `${total}`, inline: true },
          { name: 'Threshold', value: `${config.emoji.threshold}`, inline: true },
          { name: 'Would Trigger', value: wouldTrigger ? 'Yes' : 'No', inline: true }
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'whitelist') {
      const emoji = isSlash ? interaction.options.getString('emoji') : args[0];
      if (!emoji) return interaction.reply({ content: 'Provide an emoji to whitelist.', ephemeral: true });
      if (!config.emoji.whitelist) config.emoji.whitelist = [];
      if (!config.emoji.whitelist.includes(emoji)) config.emoji.whitelist.push(emoji);
      await updateGuild(interaction.guild.id, { antispam_config: JSON.stringify(config) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription(`Emoji **${emoji}** whitelisted.`)] });
    }

    if (subcommand === 'unwhitelist') {
      const emoji = isSlash ? interaction.options.getString('emoji') : args[0];
      if (!emoji) return interaction.reply({ content: 'Provide an emoji to unwhitelist.', ephemeral: true });
      if (config.emoji.whitelist) config.emoji.whitelist = config.emoji.whitelist.filter(e => e !== emoji);
      await updateGuild(interaction.guild.id, { antispam_config: JSON.stringify(config) });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription(`Emoji **${emoji}** removed from whitelist.`)] });
    }

    if (subcommand === 'stats') {
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('Emoji Spam Settings')
        .addFields(
          { name: 'Threshold', value: `${config.emoji.threshold} emojis`, inline: true },
          { name: 'Check Unicode', value: config.emoji.unicode ? 'Yes' : 'No', inline: true },
          { name: 'Check Custom', value: config.emoji.custom ? 'Yes' : 'No', inline: true },
          { name: 'Check Mixed', value: config.emoji.mixed ? 'Yes' : 'No', inline: true },
          { name: 'Action', value: config.emoji.action, inline: true },
          { name: 'Whitelisted', value: `${config.emoji.whitelist?.length || 0} emojis`, inline: true }
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  }
};
