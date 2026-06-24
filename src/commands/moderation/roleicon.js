const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roleicon')
    .setDescription('Set a role icon')
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('The role to set icon for')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('emoji')
        .setDescription('The emoji to use as role icon')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  cooldown: 5,
  aliases: ['setroleicon', 'seticon'],
  prefix: true,
  adminOnly: true,

  async execute(interaction, args) {
    try {
      const guild = interaction.guild;
      const role = interaction.options.getRole('role');
      const emoji = interaction.options.getString('emoji');

      if (!role) {
        return interaction.reply({
          embeds: [errorEmbed('Please provide a valid role.')],
          ephemeral: true
        });
      }

      if (!emoji) {
        return interaction.reply({
          embeds: [errorEmbed('Please provide a valid emoji.')],
          ephemeral: true
        });
      }

      if (role.position >= guild.members.me.roles.highest.position) {
        return interaction.reply({
          embeds: [errorEmbed('I cannot modify a role equal to or higher than my highest role.')],
          ephemeral: true
        });
      }

      const emojiRegex = /<(a?):(\w+):(\d+)>/;
      const match = emoji.match(emojiRegex);

      if (match) {
        const animated = match[1] === 'a';
        const emojiId = match[3];
        const extension = animated ? 'gif' : 'png';
        const url = `https://cdn.discordapp.com/emojis/${emojiId}.${extension}?size=128`;

        await role.setIcon(url);
      } else {
        const unicodeRegex = /\p{Emoji}/u;
        if (unicodeRegex.test(emoji)) {
          const hexCode = [...emoji].map(char =>
            char.codePointAt(0).toString(16)
          ).join('-');
          const url = `https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/${hexCode}.png`;
          await role.setIcon(url);
        } else {
          return interaction.reply({
            embeds: [errorEmbed('Please provide a valid emoji.')],
            ephemeral: true
          });
        }
      }

      const embed = successEmbed(`Successfully set icon for ${role}.`);
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in roleicon command:', error);
      await interaction.reply({
        embeds: [errorEmbed('An error occurred while setting the role icon.')],
        ephemeral: true
      });
    }
  }
};
