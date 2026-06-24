const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vote')
    .setDescription('Creates a yes/no vote')
    .addStringOption(opt => opt.setName('topic').setDescription('What to vote on').setRequired(true)),
  cooldown: 10,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
            const user = isSlash ? interaction.user : interaction.author;
            const topic = isSlash ? interaction.options?.getString('topic') : args?.join(' ');
            if (!topic) {
              return interaction.reply({ embeds: [new EmbedBuilder().setDescription('Please provide a topic to vote on.').setColor(config.embedColors.error)] });
            }

            const embed = new EmbedBuilder()
              .setTitle('Vote')
              .setColor(config.embedColors.info)
              .setDescription(`**${topic}**`)
              .addFields(
                { name: '✅ Yes', value: 'React with ✅', inline: true },
                { name: '❌ No', value: 'React with ❌', inline: true }
              )
              .setFooter({ text: `Vote by ${user.tag || user.username}` })
              .setTimestamp();

            const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
            await msg.react('✅');
            await msg.react('❌');
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
