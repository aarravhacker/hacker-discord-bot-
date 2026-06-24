const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('eval')
    .setDescription('Evaluate JavaScript code')
    .addStringOption(opt => opt.setName('code').setDescription('Code to evaluate').setRequired(true)),
  cooldown: 0,
  aliases: [],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = interaction.isChatInputCommand?.() || false;
    const user = isSlash ? interaction.user : interaction.author;
    if (user.id !== config.ownerId) {
      return interaction.reply({ embeds: [errorEmbed('Only the bot owner can use this command.')] });
    }

    const code = interaction.options?.getString('code') || args.join(' ');
    if (!code) {
      return interaction.reply({ embeds: [errorEmbed('Please provide code to evaluate.')] });
    }

    try {
      let result = await eval(code);
      if (typeof result !== 'string') result = require('util').inspect(result, { depth: 2 });

      if (result.length > 1900) result = result.slice(0, 1900) + '...';

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.embedColors.success || '#00FF00')
          .setTitle('Eval Result')
          .setDescription(`\`\`\`js\n${result}\n\`\`\``)
          .setTimestamp()]
      });
    } catch (err) {
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.embedColors.error || '#FF0000')
          .setTitle('Eval Error')
          .setDescription(`\`\`\`js\n${err.message}\n\`\`\``)
          .setTimestamp()]
      });
    }
  }
};
