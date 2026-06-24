const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukecompatibility')
    .setDescription('Check compatibility with other security systems')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  cooldown: 15,
  aliases: ['ancompatibility', 'acompatibility'],
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
      const compatibility = await securityEngine.checkCompatibility(interaction.guild.id);

      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('🔗 Antinuke Compatibility Report')
        .setDescription(`Compatibility check for **${interaction.guild.name}**`)
        .setTimestamp();

      if (compatibility?.systems?.length) {
        compatibility.systems.forEach(sys => {
          const icon = sys.compatible ? '✅' : sys.warning ? '⚠️' : '❌';
          embed.addFields({
            name: `${icon} ${sys.name}`,
            value: sys.status,
            inline: true
          });
        });
      } else {
        embed.addFields({ name: 'Systems', value: 'No other security systems detected.' });
      }

      if (compatibility?.conflicts?.length) {
        const conflicts = compatibility.conflicts.map(c => `⚠️ ${c}`).join('\n');
        embed.addFields({ name: 'Conflicts', value: conflicts });
      } else {
        embed.addFields({ name: 'Conflicts', value: '✅ No conflicts detected' });
      }

      if (compatibility?.recommendations?.length) {
        const recs = compatibility.recommendations.map(r => `• ${r}`).join('\n');
        embed.addFields({ name: 'Recommendations', value: recs });
      }

      embed.addFields(
        { name: 'Score', value: `${compatibility?.score || 100}/100`, inline: true },
        { name: 'Checked By', value: user.tag, inline: true }
      );

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Compatibility Error')
        .setDescription(`Compatibility check failed: ${error.message}`)
        .setTimestamp();
      if (interaction.deferred) {
        return interaction.editReply({ embeds: [embed] });
      }
      return interaction.reply({ embeds: [embed] });
    }
  }
};
