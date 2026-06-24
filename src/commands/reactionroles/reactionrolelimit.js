const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getGuild, updateGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactionrolelimit')
    .setDescription('Set the max number of reaction roles a user can have')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt => opt.setName('limit').setDescription('Max roles per user').setRequired(true).setMinValue(1).setMaxValue(50)),
  cooldown: 5,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
      const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
      try {
            const limit = isSlash ? interaction.options?.getInteger('limit') : (args?.[0] ? parseInt(args[0]) : null);
            if (!limit) return interaction.reply({ embeds: [errorEmbed('Please provide a limit value.')] });
            const guild = await getGuild(interaction.guild.id);
            const config = guild.reaction_role_config || {};
            config.max_roles_per_user = limit;
            await updateGuild(interaction.guild.id, { reaction_role_config: config });

            return interaction.reply({ embeds: [successEmbed('Limit Set', `Max reaction roles per user set to **${limit}**.`)] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
