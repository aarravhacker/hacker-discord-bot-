const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

const roasts = [
  "I'd explain it to you, but I left my English-to-Dumbass dictionary at home.",
  "You're the reason this gene pool needs a lifeguard.",
  "You bring everyone a lot of joy... when you leave.",
  "I'm not saying you're stupid, but you have bad luck thinking.",
  "You're so ugly when you look in the mirror, your reflection looks away.",
  "If you were any more inbred, you'd be a sandwich.",
  "I'm jealous of people who don't know you.",
  "You're the human equivalent of a participation trophy.",
  "You're like a cloud. When you disappear, it's a beautiful day.",
  "You're the reason God created the middle finger."
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roast')
    .setDescription('Roast a user (for fun!)')
    .addUserOption(option =>
      option.setName('user').setDescription('The user to roast').setRequired(false)
    ),
  cooldown: 3,
  aliases: ['roast'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
            const self = isSlash ? interaction.user : interaction.author;
            const target = interaction.options?.getUser('user') || interaction.mentions?.users?.first() || self;
            const roast = roasts[Math.floor(Math.random() * roasts.length)];

            const embed = successEmbed('Roast')
              .setDescription(`${target.username}, ${roast}`)
              .setColor(0xFF4500);

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};