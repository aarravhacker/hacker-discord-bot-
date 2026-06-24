const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { embedColors } = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automodignore')
    .setDescription('Ignore a role or channel from all auto-mod systems')
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
  aliases: ['amignore', 'ignoreautomod'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const type = args?.[0] || interaction.options?.getString('type');
      const id = args?.[1] || interaction.options?.getString('id');

      if (!type || !['role', 'channel'].includes(type)) {
        return interaction.reply({ embeds: [errorEmbed('Type must be `role` or `channel`.')] });
      }
      if (!id) return interaction.reply({ embeds: [errorEmbed('Please provide an ID.')] });

      const records = await getDB()('automod')
        .where({ guild_id: interaction.guild.id });

      let added = 0;
      for (const record of records) {
        const config = JSON.parse(record.config);
        const key = type === 'role' ? 'ignoredRoles' : 'ignoredChannels';
        if (!config[key]) config[key] = [];

        if (!config[key].includes(id)) {
          config[key].push(id);
          await getDB()('automod')
            .where({ id: record.id })
            .update({ config: JSON.stringify(config) });
          added++;
        }
      }

      const embed = new EmbedBuilder()
        .setTitle('Auto-Mod Global Ignore')
        .setDescription(`Added ${type} <@&${id}> to **${added}** module(s) ignore list.`)
        .setColor(embedColors.success)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to update auto-mod ignore list.')] });
    }
  }
};
