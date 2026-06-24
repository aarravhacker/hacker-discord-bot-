const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

const insults = [
  "You're the reason God created the middle finger.",
  "If you were any more inbred, you'd be a sandwich.",
  "You're so ugly you scared the crap out of the toilet.",
  "I'd agree with you but then we'd both be wrong.",
  "You're so fat you could be the Milky Way's stunt double.",
  "You're the human version of a participation trophy.",
  "If stupidity was a sport, you'd be an Olympic gold medalist.",
  "You're so dense light bends around you.",
  "I'm jealous of people who don't know you.",
  "You're like a cloud. When you disappear, it's a beautiful day."
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('insult')
    .setDescription('Insult a user (for fun!)')
    .addUserOption(option =>
      option.setName('user').setDescription('The user to insult').setRequired(false)
    ),
  cooldown: 3,
  aliases: ['insult'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
            const self = isSlash ? interaction.user : interaction.author;
            const target = interaction.options?.getUser('user') || interaction.mentions?.users?.first() || self;
            const insult = insults[Math.floor(Math.random() * insults.length)];

            const embed = successEmbed('Insult')
              .setDescription(`${target.username}, ${insult}`)
              .setColor(0xFF0000);

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};