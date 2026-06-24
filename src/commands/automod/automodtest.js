const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed, warningEmbed } = require('../../utils/helpers');
const { embedColors } = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automodtest')
    .setDescription('Test an auto-moderation module with a message')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('module')
        .setDescription('Module to test')
        .setRequired(true)
        .addChoices(
          { name: 'Word Filter', value: 'wordfilter' },
          { name: 'Spam Filter', value: 'spamfilter' },
          { name: 'Caps Filter', value: 'capsfilter' },
          { name: 'Emoji Spam', value: 'emojispam' },
          { name: 'Anti-Spam', value: 'antispam' }
        )
    )
    .addStringOption(opt =>
      opt.setName('message').setDescription('Test message').setRequired(true)
    ),
  cooldown: 10,
  aliases: ['amtest', 'testautomod'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const moduleType = args?.[0] || interaction.options?.getString('module');
      const message = args?.[1] || interaction.options?.getString('message');

      if (!moduleType || !message) {
        return interaction.reply({ embeds: [errorEmbed('Please provide a module type and test message.')] });
      }

      const record = await getDB()('automod')
        .where({ guild_id: interaction.guild.id, type: moduleType })
        .first();

      if (!record) {
        return interaction.reply({ embeds: [warningEmbed(`No \`${moduleType}\` rule configured. Add one first.`)] });
      }

      if (!record.enabled) {
        return interaction.reply({ embeds: [warningEmbed(`\`${moduleType}\` is disabled. Enable it first.`)] });
      }

      const config = JSON.parse(record.config);
      let triggered = false;
      let reason = '';

      switch (moduleType) {
        case 'wordfilter': {
          const lowerMsg = message.toLowerCase();
          const matched = config.words.find(w => lowerMsg.includes(w));
          if (matched) {
            triggered = true;
            reason = `Matched filtered word: \`${matched}\``;
          }
          break;
        }
        case 'capsfilter': {
          const letters = message.replace(/[^a-zA-Z]/g, '');
          if (letters.length >= (config.minChars || 5)) {
            const upper = letters.replace(/[^A-Z]/g, '').length;
            const percent = (upper / letters.length) * 100;
            if (percent > (config.limit || 70)) {
              triggered = true;
              reason = `Caps percentage: ${percent.toFixed(1)}% (limit: ${config.limit || 70}%)`;
            }
          }
          break;
        }
        case 'emojispam': {
          const emojiRegex = /<a?:\w+:\d+>|\u{1F300}-\u{1F9FF}/gu;
          const emojis = message.match(emojiRegex) || [];
          if (emojis.length > (config.limit || 10)) {
            triggered = true;
            reason = `Emoji count: ${emojis.length} (limit: ${config.limit || 10})`;
          }
          break;
        }
        case 'spamfilter':
        case 'antispam':
          triggered = false;
          reason = 'Spam detection requires message history — cannot test with a single message.';
          break;
      }

      const embed = new EmbedBuilder()
        .setTitle('Auto-Mod Test Result')
        .setColor(triggered ? embedColors.error : embedColors.success)
        .addFields(
          { name: 'Module', value: moduleType, inline: true },
          { name: 'Triggered', value: triggered ? '✅ Yes' : '❌ No', inline: true },
          { name: 'Action', value: config.action || 'N/A', inline: true },
          { name: 'Test Message', value: message.length > 100 ? message.substring(0, 100) + '...' : message }
        )
        .setTimestamp();

      if (reason) embed.addFields({ name: 'Reason', value: reason });

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to test auto-mod.')] });
    }
  }
};
