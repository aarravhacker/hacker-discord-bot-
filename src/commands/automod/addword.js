const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { embedColors } = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addword')
    .setDescription('Add a word to the filter list')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('word').setDescription('The word to filter').setRequired(true)
    ),
  cooldown: 3,
  aliases: ['addbadword', 'filteradd'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const word = (args?.[0] || interaction.options?.getString('word') || '').toLowerCase().trim();
      if (!word) return interaction.reply({ embeds: [errorEmbed('Please provide a word to add.')] });

      const record = await getDB()('automod')
        .where({ guild_id: interaction.guild.id, type: 'wordfilter' })
        .first();

      const config = record ? JSON.parse(record.config) : { words: [], action: 'delete', logChannel: null, ignoredRoles: [], ignoredChannels: [] };

      if (config.words.includes(word)) {
        return interaction.reply({ embeds: [errorEmbed(`\`${word}\` is already in the filter list.`)] });
      }

      config.words.push(word);

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
        .setTitle('Word Added')
        .setDescription(`Added \`${word}\` to the filter list.`)
        .setColor(embedColors.success)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to add word.')] });
    }
  }
};
