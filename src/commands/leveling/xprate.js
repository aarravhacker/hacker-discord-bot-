const { SlashCommandBuilder } = require('discord.js');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xprate')
    .setDescription('Set the XP gain rate per message')
    .addIntegerOption(option =>
      option.setName('min').setDescription('Minimum XP per message').setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('max').setDescription('Maximum XP per message').setRequired(true)
    ),
  cooldown: 5,
  aliases: ['xprate'],
  prefix: true,
  async execute(interaction, args) {
    if (!interaction.member?.permissions?.has('MANAGE_GUILD')) {
      return interaction.reply({ embeds: [errorEmbed('You need Manage Server permission.')] });
    }

    const guildId = interaction.guild?.id;
    const min = interaction.options?.getInteger('min') || parseInt(args?.[0]);
    const max = interaction.options?.getInteger('max') || parseInt(args?.[1]);

    if (!min || !max || min < 1 || max < min || max > 100) {
      return interaction.reply({ embeds: [errorEmbed('Please provide valid min (1+) and max (min to 100) values.')] });
    }

    try {
      await updateGuild(guildId, { xp_rate_min: min, xp_rate_max: max });

      const embed = successEmbed('XP Rate Updated')
        .setDescription(`XP rate set to **${min} - ${max}** XP per message.`)
        .setColor(0x00FF00);

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('An error occurred while setting XP rate.')] });
    }
  }
};
