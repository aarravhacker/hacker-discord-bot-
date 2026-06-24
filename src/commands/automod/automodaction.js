const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { embedColors } = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automodaction')
    .setDescription('Set the default action for all auto-mod modules')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('action')
        .setDescription('Default action')
        .setRequired(true)
        .addChoices(
          { name: 'Delete', value: 'delete' },
          { name: 'Warn', value: 'warn' },
          { name: 'Mute', value: 'mute' },
          { name: 'Kick', value: 'kick' },
          { name: 'Ban', value: 'ban' },
          { name: 'Timeout', value: 'timeout' }
        )
    ),
  cooldown: 3,
  aliases: ['amaction', 'setamaction'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const action = args?.[0] || interaction.options?.getString('action');
      const validActions = ['delete', 'warn', 'mute', 'kick', 'ban', 'timeout'];
      if (!action || !validActions.includes(action)) {
        return interaction.reply({ embeds: [errorEmbed(`Invalid action. Valid: ${validActions.join(', ')}`)] });
      }

      const records = await getDB()('automod')
        .where({ guild_id: interaction.guild.id });

      let updated = 0;
      for (const record of records) {
        const config = JSON.parse(record.config);
        config.action = action;
        await getDB()('automod')
          .where({ id: record.id })
          .update({ config: JSON.stringify(config) });
        updated++;
      }

      const embed = new EmbedBuilder()
        .setTitle('Auto-Mod Default Action')
        .setDescription(`Updated action to **${action}** for **${updated}** module(s).`)
        .setColor(embedColors.success)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to set auto-mod action.')] });
    }
  }
};
