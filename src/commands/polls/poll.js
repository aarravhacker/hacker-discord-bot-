const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a poll')
    .addStringOption(opt => opt.setName('question').setDescription('Poll question').setRequired(true))
    .addStringOption(opt => opt.setName('options').setDescription('Options separated by semicolons (;)').setRequired(true))
    .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in minutes').setRequired(false)),
  cooldown: 10,
  aliases: ['createpoll'],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = interaction.isChatInputCommand?.() || false;
    const user = isSlash ? interaction.user : interaction.author;
    try {
      const question = interaction.options?.getString('question') || args[0];
      const optionsStr = interaction.options?.getString('options') || args[1];
      const duration = interaction.options?.getInteger('duration') || (args[2] ? parseInt(args[2]) : null);

      if (!question || !optionsStr) {
        return interaction.reply({ embeds: [errorEmbed('Usage: /poll <question> <options separated by ;> [duration in minutes]')] });
      }

      const options = optionsStr.split(';').map(o => o.trim()).filter(o => o.length > 0);
      if (options.length < 2 || options.length > 10) {
        return interaction.reply({ embeds: [errorEmbed('Provide between 2 and 10 options separated by semicolons (;)')] });
      }

      const reactions = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
      const description = options.map((opt, i) => `${reactions[i]} ${opt}`).join('\n');

      const embed = new EmbedBuilder()
        .setColor(config.embedColors.poll || '#3498DB')
        .setTitle(`📊 ${question}`)
        .setDescription(description)
        .setFooter({ text: `Poll by ${user.tag} | ${options.length} options` })
        .setTimestamp();

      if (duration) {
        embed.addFields({ name: 'Duration', value: `${duration} minute(s)` });
      }

      const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
      for (let i = 0; i < options.length; i++) {
        await msg.react(reactions[i]);
      }

      const db = getDB();
      await db('polls').insert({
        message_id: msg.id,
        channel_id: interaction.channel.id,
        guild_id: interaction.guild.id,
        creator_id: user.id,
        question: question,
        options: JSON.stringify(options),
        end_time: duration ? new Date(Date.now() + duration * 60000) : null,
        ended: false
      });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to create poll.')] });
    }
  }
};
