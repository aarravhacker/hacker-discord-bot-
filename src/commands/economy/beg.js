const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed, formatNumber } = require('../../utils/helpers');
const { getUser, updateUser } = require('../../db/userRepository');
const config = require('../../config');

const responses = [
  { text: 'A kind stranger gave you some coins!', min: 10, max: 100 },
  { text: 'Someone felt bad and donated!', min: 20, max: 150 },
  { text: 'You found some coins on the ground!', min: 5, max: 50 },
  { text: 'A rich person tossed you some change!', min: 50, max: 300 },
  { text: 'You begged but got nothing.', min: 0, max: 0 },
  { text: 'People ignored you.', min: 0, max: 0 },
  { text: 'A child gave you their pocket money!', min: 1, max: 25 },
  { text: 'You earned a few coins from sympathy.', min: 15, max: 80 }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('beg')
    .setDescription('Beg for money'),
  cooldown: 30,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;
    try {
      const userData = await getUser(user.id, interaction.guild.id);
      const lastBeg = userData.last_beg || 0;
      const now = Date.now();
      const cooldown = 30000;

      if (now - lastBeg < cooldown) {
        const remaining = Math.ceil((cooldown - (now - lastBeg)) / 1000);
        return interaction.reply({ embeds: [errorEmbed(`You need to wait **${remaining}** seconds before begging again.`)] });
      }

      const response = responses[Math.floor(Math.random() * responses.length)];
      const earned = Math.floor(Math.random() * (response.max - response.min + 1)) + response.min;

      await updateUser(user.id, interaction.guild.id, {
        balance: (userData.balance || 0) + earned,
        last_beg: now
      });

      const embed = new EmbedBuilder()
        .setColor(earned > 0 ? config.embedColors.economy || '#FFD700' : config.embedColors.error || '#FF0000')
        .setTitle('Begging')
        .setDescription(earned > 0 ? `${response.text}\nYou earned **$${formatNumber(earned)}**!` : response.text)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to beg.')] });
    }
  }
};
