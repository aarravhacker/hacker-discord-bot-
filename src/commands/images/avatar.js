const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Get a user\'s avatar')
    .addUserOption(opt => opt.setName('user').setDescription('User to get avatar from').setRequired(false)),
  cooldown: 3,
  aliases: ['av', 'pfp'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
      const self = isSlash ? interaction.user : interaction.author;
      const user = interaction.options?.getUser('user') || (args[0] ? interaction.guild.members.cache.get(args[0])?.user : null) || self;
      const avatar = user.displayAvatarURL({ size: 4096, dynamic: true });

      const embed = new EmbedBuilder()
        .setColor(config.embedColors.images || '#9B59B6')
        .setTitle(`${user.tag}'s Avatar`)
        .setImage(avatar)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to get avatar.')] });
    }
  }
};
