const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { embedColors } = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removeword')
    .setDescription('Remove a word from the filter list')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('word').setDescription('The word to remove').setRequired(true)
    ),
  cooldown: 3,
  aliases: ['removebadword', 'filterremove'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const word = (args?.[0] || interaction.options?.getString('word') || '').toLowerCase().trim();
      if (!word) return interaction.reply({ embeds: [errorEmbed('Please provide a word to remove.')] });

      const record = await getDB()('automod')
        .where({ guild_id: interaction.guild.id, type: 'wordfilter' })
        .first();

      if (!record) return interaction.reply({ embeds: [errorEmbed('No word filter configured.')] });

      const config = JSON.parse(record.config);
      const idx = config.words.indexOf(word);
      if (idx === -1) return interaction.reply({ embeds: [errorEmbed(`\`${word}\` is not in the filter list.`)] });

      config.words.splice(idx, 1);
      await getDB()('automod')
        .where({ guild_id: interaction.guild.id, type: 'wordfilter' })
        .update({ config: JSON.stringify(config) });

      const embed = new EmbedBuilder()
        .setTitle('Word Removed')
        .setDescription(`Removed \`${word}\` from the filter list.`)
        .setColor(embedColors.success)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to remove word.')] });
    }
  }
};
