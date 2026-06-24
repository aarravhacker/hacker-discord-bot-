const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');
const { getUser, updateUser } = require('../../db/userRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Blacklist a user from using the bot')
    .addUserOption(opt => opt.setName('user').setDescription('User to blacklist').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for blacklisting').setRequired(false)),
  cooldown: 0,
  aliases: [],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = interaction.isChatInputCommand?.() || false;
    const caller = isSlash ? interaction.user : interaction.author;
    if (caller.id !== config.ownerId) {
      return interaction.reply({ embeds: [errorEmbed('Only the bot owner can use this command.')] });
    }

    const user = interaction.options?.getUser('user') || interaction.guild.members.cache.get(args[0])?.user;
    const reason = interaction.options?.getString('reason') || args.slice(1).join(' ') || 'No reason provided';

    if (!user) {
      return interaction.reply({ embeds: [errorEmbed('Please specify a user to blacklist.')] });
    }

    try {
      const userData = await getUser(user.id, interaction.guild.id);
      await updateUser(user.id, interaction.guild.id, {
        ...userData,
        blacklisted: true,
        blacklist_reason: reason
      });

      await interaction.reply({ embeds: [successEmbed(`Blacklisted ${user.tag}: ${reason}`)] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to blacklist user.')] });
    }
  }
};
