const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukepatterns')
    .setDescription('View learned attack patterns')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  cooldown: 10,
  aliases: ['anpatterns', 'apatterns'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Permission Denied')
        .setDescription('You need Administrator permission to use this command.')
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    try {
      await interaction.deferReply();
      const patterns = await securityEngine.getAttackPatterns(interaction.guild.id);

      const patternList = patterns?.patterns || [];
      const embed = new EmbedBuilder()
        .setColor(0x9900ff)
        .setTitle('🔍 Learned Attack Patterns')
        .setDescription(`Patterns identified from past incidents in **${interaction.guild.name}**`)
        .setTimestamp();

      if (patternList.length > 0) {
        const patternText = patternList.slice(0, 15).map((p, i) =>
          `\`${i + 1}.\` **${p.type}** - ${p.description} (Confidence: ${p.confidence}%)`
        ).join('\n');
        embed.addFields({ name: 'Identified Patterns', value: patternText });
      } else {
        embed.addFields({ name: 'Patterns', value: 'No attack patterns have been learned yet. Patterns are learned from past incidents.' });
      }

      embed.addFields(
        { name: 'Total Patterns', value: String(patternList.length), inline: true },
        { name: 'Last Updated', value: patterns?.lastUpdated || 'Never', inline: true },
        { name: 'Learning Enabled', value: patterns?.learningEnabled ? 'Yes' : 'No', inline: true }
      );

      if (patterns?.topAttackers?.length) {
        const attackers = patterns.topAttackers.slice(0, 5).map(a => `${a.tag} (${a.count} attacks)`).join('\n');
        embed.addFields({ name: 'Top Attackers', value: attackers });
      }

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Error')
        .setDescription(`Failed to retrieve patterns: ${error.message}`)
        .setTimestamp();
      if (interaction.deferred) {
        return interaction.editReply({ embeds: [embed] });
      }
      return interaction.reply({ embeds: [embed] });
    }
  }
};
