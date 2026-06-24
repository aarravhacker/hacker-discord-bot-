const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { embedColors } = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('emojispam')
    .setDescription('Toggle emoji spam detection')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption(opt =>
      opt.setName('enabled').setDescription('Enable or disable emoji spam filter').setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('limit').setDescription('Max emojis per message').setRequired(false)
        .setMinValue(1).setMaxValue(50)
    ),
  cooldown: 3,
  aliases: ['toggleemojispam', 'emojilimit'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const enabled = args?.[0] === 'true' || args?.[0] === 'on' || interaction.options?.getBoolean('enabled');
      const limit = parseInt(args?.[1] || interaction.options?.getInteger('limit')) || 10;

      const record = await getDB()('automod')
        .where({ guild_id: interaction.guild.id, type: 'emojispam' })
        .first();

      const config = record
        ? JSON.parse(record.config)
        : { limit: 10, action: 'delete', logChannel: null, ignoredRoles: [], ignoredChannels: [] };

      config.limit = limit;

      if (record) {
        await getDB()('automod')
          .where({ guild_id: interaction.guild.id, type: 'emojispam' })
          .update({ config: JSON.stringify(config), enabled });
      } else {
        await getDB()('automod').insert({
          guild_id: interaction.guild.id,
          type: 'emojispam',
          config: JSON.stringify(config),
          enabled
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('Emoji Spam Filter')
        .setDescription(`Emoji spam filter **${enabled ? 'enabled' : 'disabled'}**.\nLimit: **${limit}** emojis per message.`)
        .setColor(enabled ? embedColors.success : embedColors.warning)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to configure emoji spam filter.')] });
    }
  }
};
