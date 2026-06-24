const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('strawpoll')
    .setDescription('Creates a strawpoll-style poll')
    .addStringOption(opt => opt.setName('question').setDescription('Poll question').setRequired(true))
    .addStringOption(opt => opt.setName('options').setDescription('Options separated by | (2-6 options)').setRequired(true)),
  cooldown: 10,
  aliases: ['sp'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
            const user = isSlash ? interaction.user : interaction.author;

            let question, options;
            if (isSlash) {
              const fullText = `${interaction.options?.getString('question')} | ${interaction.options?.getString('options')}`;
              const parts = fullText.split('|').map(p => p.trim());
              question = parts[0];
              options = parts.slice(1).filter(o => o.length > 0);
            } else {
              if (!args || args.length < 2) {
                return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Usage: `/strawpoll <question> | <option1> | <option2>`').setColor(config.embedColors.error)] });
              }
              const fullText = args.join(' ');
              const parts = fullText.split('|').map(p => p.trim());
              question = parts[0];
              options = parts.slice(1).filter(o => o.length > 0);
            }

            if (options.length < 2) {
              return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Please provide at least 2 options.').setColor(config.embedColors.error)] });
            }

            if (options.length > 6) {
              return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Maximum 6 options allowed.').setColor(config.embedColors.error)] });
            }

            const letterEmojis = ['🇦', '🇧', '🇨', '🇩', '🇪', '🇫'];
            const description = options.map((opt, i) => `${letterEmojis[i]} ${opt}`).join('\n');

            const embed = new EmbedBuilder()
              .setTitle('Strawpoll')
              .setColor(config.embedColors.info)
              .setDescription(`**${question}**\n\n${description}`)
              .setFooter({ text: `Poll by ${user.tag || user.username} • React to vote!` })
              .setTimestamp();

            const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
            for (let i = 0; i < options.length; i++) {
              await msg.react(letterEmojis[i]);
            }
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
