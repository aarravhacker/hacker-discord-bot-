const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('decoyscan')
    .setDescription('Scan for triggered decoys')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['decoyscan', 'dscan'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;
    const guild = interaction.guild;

    try {
      if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setDescription('You need Administrator permission to use this command.');
        return interaction.reply({ embeds: [embed] });
      }

      const decoys = securityEngine.getDecoys(guild.id);
      const triggered = decoys.filter(d => d.triggered);
      const active = decoys.filter(d => !d.triggered);

      let color = 0x00ff00;
      if (triggered.length > 0) color = 0xff6600;
      if (triggered.length > 3) color = 0xff0000;

      const embed = new EmbedBuilder()
        .setTitle('🪤 Decoy Scan Results')
        .setDescription(`Scanned **${decoys.length}** decoys in this server.`)
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() });

      embed.addFields(
        { name: 'Total Decoys', value: `**${decoys.length}**`, inline: true },
        { name: 'Active', value: `**${active.length}**`, inline: true },
        { name: 'Triggered', value: `**${triggered.length}**`, inline: true }
      );

      if (triggered.length > 0) {
        const triggeredDecoys = triggered.slice(0, 10).map(d => {
          return `🔴 **${d.type}** — Triggered **${d.triggerCount}** time(s)\n> Created: <t:${Math.floor(d.created / 1000)}:R>`;
        }).join('\n\n');

        embed.addFields({
          name: '⚠️ Triggered Decoys',
          value: triggeredDecoys.substring(0, 1024),
          inline: false
        });

        embed.addFields({
          name: '🚨 Action Required',
          value: 'Triggered decoys indicate possible reconnaissance. Investigate the triggering users immediately.',
          inline: false
        });
      } else {
        embed.addFields({
          name: '✅ Status',
          value: 'No decoys have been triggered. All decoys are in normal state.',
          inline: false
        });
      }

      if (active.length > 0) {
        const activeList = active.slice(0, 10).map(d => {
          return `🟢 **${d.type}** — Created <t:${Math.floor(d.created / 1000)}:R>`;
        }).join('\n');

        embed.addFields({
          name: 'Active Decoys',
          value: activeList.substring(0, 1024),
          inline: false
        });
      }

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while scanning decoys.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
