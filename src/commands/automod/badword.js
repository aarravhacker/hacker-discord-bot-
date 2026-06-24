const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { embedColors } = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('badword')
    .setDescription('Add a bad word with a custom response')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('word').setDescription('The bad word').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('response').setDescription('Custom response message').setRequired(false)
    ),
  cooldown: 3,
  aliases: ['addbad', 'setbadword'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const word = (args?.[0] || interaction.options?.getString('word') || '').toLowerCase().trim();
      const response = args?.[1] || interaction.options?.getString('response') || 'That word is not allowed here.';

      if (!word) return interaction.reply({ embeds: [errorEmbed('Please provide a word.')] });

      const record = await getDB()('automod')
        .where({ guild_id: interaction.guild.id, type: 'wordfilter' })
        .first();

      const config = record
        ? JSON.parse(record.config)
        : { words: [], customResponses: {}, action: 'delete', logChannel: null, ignoredRoles: [], ignoredChannels: [] };

      if (!config.customResponses) config.customResponses = {};
      config.customResponses[word] = response;

      if (!config.words.includes(word)) {
        config.words.push(word);
      }

      if (record) {
        await getDB()('automod')
          .where({ guild_id: interaction.guild.id, type: 'wordfilter' })
          .update({ config: JSON.stringify(config) });
      } else {
        await getDB()('automod').insert({
          guild_id: interaction.guild.id,
          type: 'wordfilter',
          config: JSON.stringify(config),
          enabled: true
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('Bad Word Added')
        .setDescription(`Added \`${word}\` with response: ${response}`)
        .setColor(embedColors.success)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to add bad word.')] });
    }
  }
};
