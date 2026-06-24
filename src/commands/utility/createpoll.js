const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('createpoll')
    .setDescription('Creates a multi-option poll')
    .addStringOption(opt => opt.setName('question').setDescription('Poll question').setRequired(true))
    .addStringOption(opt => opt.setName('options').setDescription('Options separated by | (e.g., Option 1 | Option 2 | Option 3)').setRequired(true)),
  cooldown: 10,
  aliases: ['mpoll'],
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
                return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Usage: `/createpoll <question> | <option1> | <option2> | ...`').setColor(config.embedColors.error)] });
              }
              const fullText = args.join(' ');
              const parts = fullText.split('|').map(p => p.trim());
              question = parts[0];
              options = parts.slice(1).filter(o => o.length > 0);
            }

            if (options.length < 2) {
              return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Please provide at least 2 options.').setColor(config.embedColors.error)] });
            }

            if (options.length > 10) {
              return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Maximum 10 options allowed.').setColor(config.embedColors.error)] });
            }

            const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

            const description = options.map((opt, i) => `${numberEmojis[i]} ${opt}`).join('\n');

            const embed = new EmbedBuilder()
              .setTitle('Poll')
              .setColor(config.embedColors.info)
              .setDescription(`**${question}**\n\n${description}`)
              .setFooter({ text: `Poll by ${user.tag || user.username} • React to vote!` })
              .setTimestamp();

            const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
            for (let i = 0; i < options.length; i++) {
              await msg.react(numberEmojis[i]);
            }
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
