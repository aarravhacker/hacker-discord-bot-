const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { embedColors } = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('capslimit')
    .setDescription('Set the caps filter percentage limit')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt =>
      opt.setName('percent').setDescription('Max caps percentage (1-100)').setRequired(true)
        .setMinValue(1).setMaxValue(100)
    ),
  cooldown: 3,
  aliases: ['setcapslimit', 'capspercent'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const percent = parseInt(args?.[0] || interaction.options?.getInteger('percent'));
      if (isNaN(percent) || percent < 1 || percent > 100) {
        return interaction.reply({ embeds: [errorEmbed('Please provide a percentage between 1 and 100.')] });
      }

      const record = await getDB()('automod')
        .where({ guild_id: interaction.guild.id, type: 'capsfilter' })
        .first();

      const config = record
        ? JSON.parse(record.config)
        : { limit: 70, minChars: 5, action: 'delete', logChannel: null, ignoredRoles: [], ignoredChannels: [] };

      config.limit = percent;

      if (record) {
        await getDB()('automod')
          .where({ guild_id: interaction.guild.id, type: 'capsfilter' })
          .update({ config: JSON.stringify(config) });
      } else {
        await getDB()('automod').insert({
          guild_id: interaction.guild.id,
          type: 'capsfilter',
          config: JSON.stringify(config),
          enabled: true
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('Caps Limit Updated')
        .setDescription(`Caps filter limit set to **${percent}%**.`)
        .setColor(embedColors.success)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to set caps limit.')] });
    }
  }
};
