const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { embedColors } = require('../../config');
const { getDB } = require('../../db/connection');

const DEFAULT_PROFANITY = [
  'fuck', 'shit', 'ass', 'bitch', 'damn', 'crap', 'dick', 'cock', 'pussy',
  'asshole', 'bastard', 'slut', 'whore', 'dumbass', 'motherfucker', 'wtf',
  'stfu', 'lmao', 'prick', 'bollocks'
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profanity')
    .setDescription('Toggle profanity filter with default word list')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption(opt =>
      opt.setName('enabled').setDescription('Enable or disable profanity filter').setRequired(true)
    ),
  cooldown: 3,
  aliases: ['toggleprofanity', 'profanityfilter'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const enabled = args?.[0] === 'true' || args?.[0] === 'on' || interaction.options?.getBoolean('enabled');

      const record = await getDB()('automod')
        .where({ guild_id: interaction.guild.id, type: 'wordfilter' })
        .first();

      const config = record
        ? JSON.parse(record.config)
        : { words: [], action: 'delete', logChannel: null, ignoredRoles: [], ignoredChannels: [] };

      if (!config.profanityList) config.profanityList = [];

      if (enabled) {
        for (const word of DEFAULT_PROFANITY) {
          if (!config.words.includes(word)) config.words.push(word);
          if (!config.profanityList.includes(word)) config.profanityList.push(word);
        }
      } else {
        config.words = config.words.filter(w => !config.profanityList.includes(w));
        config.profanityList = [];
      }

      if (record) {
        await getDB()('automod')
          .where({ guild_id: interaction.guild.id, type: 'wordfilter' })
          .update({ config: JSON.stringify(config), enabled: true });
      } else {
        await getDB()('automod').insert({
          guild_id: interaction.guild.id,
          type: 'wordfilter',
          config: JSON.stringify(config),
          enabled: true
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('Profanity Filter')
        .setDescription(`Profanity filter has been **${enabled ? 'enabled' : 'disabled'}**.\nAdded ${DEFAULT_PROFANITY.length} default words.`)
        .setColor(enabled ? embedColors.success : embedColors.warning)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to toggle profanity filter.')] });
    }
  }
};
