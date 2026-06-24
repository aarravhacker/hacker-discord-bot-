const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('banner')
    .setDescription('Get a user\'s banner')
    .addUserOption(opt => opt.setName('user').setDescription('User to get banner from').setRequired(false)),
  cooldown: 3,
  aliases: ['userbanner'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
      const self = isSlash ? interaction.user : interaction.author;
      const targetUser = interaction.options?.getUser('user') || (args[0] ? interaction.guild.members.cache.get(args[0])?.user : null) || self;
      const fetchedUser = await interaction.client.users.fetch(targetUser.id, { force: true });

      if (!fetchedUser.banner) {
        return interaction.reply({ embeds: [errorEmbed('This user has no banner.')] });
      }

      const embed = new EmbedBuilder()
        .setColor(config.embedColors.images || '#9B59B6')
        .setTitle(`${fetchedUser.tag}'s Banner`)
        .setImage(fetchedUser.bannerURL({ size: 4096 }))
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to get banner.')] });
    }
  }
};
