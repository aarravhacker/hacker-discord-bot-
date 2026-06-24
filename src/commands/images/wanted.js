const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wanted')
    .setDescription('Create a wanted poster')
    .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(false)),
  cooldown: 5,
  aliases: ['arrested', 'jail'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
      const self = isSlash ? interaction.user : interaction.author;
      const user = interaction.options?.getUser('user') || (args[0] ? interaction.guild.members.cache.get(args[0])?.user : null) || self;

      const embed = new EmbedBuilder()
        .setColor(config.embedColors.images || '#9B59B6')
        .setTitle('Wanted Poster')
        .setDescription(`**${user.tag}**\nImage manipulation required to generate the wanted poster.`)
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to create wanted poster.')] });
    }
  }
};
