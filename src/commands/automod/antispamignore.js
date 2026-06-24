const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { embedColors } = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antispamignore')
    .setDescription('Ignore a role or channel from anti-spam')
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
  aliases: ['asignore', 'ignoreantispam'],
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
        .where({ guild_id: interaction.guild.id, type: 'antispam' })
        .first();

      const config = record
        ? JSON.parse(record.config)
        : {
          messageThreshold: 5, timeWindow: 10, duplicateThreshold: 3,
          linkThreshold: 3, mentionThreshold: 5, action: 'warn',
          logChannel: null, ignoredRoles: [], ignoredChannels: []
        };

      const key = type === 'role' ? 'ignoredRoles' : 'ignoredChannels';
      if (!config[key]) config[key] = [];

      if (config[key].includes(id)) {
        config[key] = config[key].filter(i => i !== id);
        if (record) {
          await getDB()('automod')
            .where({ guild_id: interaction.guild.id, type: 'antispam' })
            .update({ config: JSON.stringify(config) });
        }
        const embed = new EmbedBuilder()
          .setTitle('Anti-Spam Ignore Removed')
          .setDescription(`Removed ${type} <@&${id}> from anti-spam ignore list.`)
          .setColor(embedColors.warning)
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      config[key].push(id);

      if (record) {
        await getDB()('automod')
          .where({ guild_id: interaction.guild.id, type: 'antispam' })
          .update({ config: JSON.stringify(config) });
      } else {
        await getDB()('automod').insert({
          guild_id: interaction.guild.id,
          type: 'antispam',
          config: JSON.stringify(config),
          enabled: true
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('Anti-Spam Ignore Added')
        .setDescription(`Added ${type} <@&${id}> to anti-spam ignore list.`)
        .setColor(embedColors.success)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to update anti-spam ignore list.')] });
    }
  }
};
