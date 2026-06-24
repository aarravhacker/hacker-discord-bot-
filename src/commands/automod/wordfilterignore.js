const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { embedColors } = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wordfilterignore')
    .setDescription('Ignore a role or channel from word filtering')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('type').setDescription('Role or channel').setRequired(true)
        .addChoices(
          { name: 'Role', value: 'role' },
          { name: 'Channel', value: 'channel' }
        )
    )
    .addStringOption(opt =>
      opt.setName('id').setDescription('The ID of the role or channel').setRequired(true)
    ),
  cooldown: 3,
  aliases: ['wfignore', 'filterignore'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const type = args?.[0] || interaction.options?.getString('type');
      const id = args?.[1] || interaction.options?.getString('id');

      if (!type || !['role', 'channel'].includes(type)) {
        return interaction.reply({ embeds: [errorEmbed('Type must be `role` or `channel`.')] });
      }
      if (!id) return interaction.reply({ embeds: [errorEmbed('Please provide an ID.')] });

      const record = await getDB()('automod')
        .where({ guild_id: interaction.guild.id, type: 'wordfilter' })
        .first();

      const config = record
        ? JSON.parse(record.config)
        : { words: [], action: 'delete', logChannel: null, ignoredRoles: [], ignoredChannels: [] };

      const key = type === 'role' ? 'ignoredRoles' : 'ignoredChannels';
      if (!config[key]) config[key] = [];

      if (config[key].includes(id)) {
        config[key] = config[key].filter(i => i !== id);
        const embed = new EmbedBuilder()
          .setTitle('Word Filter Ignore Removed')
          .setDescription(`Removed ${type} <@&${id}> from ignored list.`)
          .setColor(embedColors.warning)
          .setTimestamp();
        if (record) {
          await getDB()('automod')
            .where({ guild_id: interaction.guild.id, type: 'wordfilter' })
            .update({ config: JSON.stringify(config) });
        }
        return interaction.reply({ embeds: [embed] });
      }

      config[key].push(id);

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
        .setTitle('Word Filter Ignore Added')
        .setDescription(`Added ${type} <@&${id}> to ignored list.`)
        .setColor(embedColors.success)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to update ignore list.')] });
    }
  }
};
