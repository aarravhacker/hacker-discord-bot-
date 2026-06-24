const { SlashCommandBuilder, EmbedBuilder, ReactionType } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Creates a simple yes/no poll')
    .addStringOption(opt => opt.setName('question').setDescription('Poll question').setRequired(true)),
  cooldown: 10,
  aliases: ['vote'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
            const user = isSlash ? interaction.user : interaction.author;
            const question = isSlash ? interaction.options?.getString('question') : args?.join(' ');
            if (!question) {
              return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Please provide a poll question.').setColor(config.embedColors.error)] });
            }

            const embed = new EmbedBuilder()
              .setTitle('Poll')
              .setColor(config.embedColors.info)
              .setDescription(`**${question}**`)
              .addFields(
                { name: 'Yes', value: '👍', inline: true },
                { name: 'No', value: '👎', inline: true }
              )
              .setFooter({ text: `Poll by ${user.tag || user.username}` })
              .setTimestamp();

            const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
            await msg.react('👍');
            await msg.react('👎');
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
