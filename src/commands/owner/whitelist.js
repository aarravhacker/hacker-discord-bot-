const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');
const { getUser, updateUser } = require('../../db/userRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Whitelist a user (remove from blacklist)')
    .addUserOption(opt => opt.setName('user').setDescription('User to whitelist').setRequired(true)),
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
    if (!user) {
      return interaction.reply({ embeds: [errorEmbed('Please specify a user to whitelist.')] });
    }

    try {
      const userData = await getUser(user.id, interaction.guild.id);
      await updateUser(user.id, interaction.guild.id, {
        ...userData,
        blacklisted: false,
        blacklist_reason: null
      });

      await interaction.reply({ embeds: [successEmbed(`Whitelisted ${user.tag}.`)] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to whitelist user.')] });
    }
  }
};
