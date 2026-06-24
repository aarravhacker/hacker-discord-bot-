const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antiraidhistory2')
    .setDescription('Raid history analysis')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt =>
      opt.setName('days')
        .setDescription('Number of days to look back (default: 7)')
        .setMinValue(1)
        .setMaxValue(30)
    ),
  cooldown: 5,
  aliases: ['arhistory'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permissions to use this command.', ephemeral: true });
    }

    const days = isSlash
      ? (interaction.options.getInteger('days') || 7)
      : (parseInt(args[0]) || 7);

    const history = await securityEngine.getRaidHistory(interaction.guild.id, days);
    const raids = history.raids || [];
    const totalRaids = raids.length;
    const totalBans = history.totalBans || 0;
    const totalKicks = history.totalKicks || 0;
    const avgJoinRate = history.avgJoinRate || 0;
    const peakJoinRate = history.peakJoinRate || 0;

    const embed = new EmbedBuilder()
      .setTitle('Raid History Analysis')
      .setDescription(`Raid history for the last **${days}** days in **${interaction.guild.name}**`)
      .setColor(0x0099ff)
      .addFields(
        { name: 'Total Raids Detected', value: `\`${totalRaids}\``, inline: true },
        { name: 'Total Bans', value: `\`${totalBans}\``, inline: true },
        { name: 'Total Kicks', value: `\`${totalKicks}\``, inline: true },
        { name: 'Avg Join Rate', value: `\`${avgJoinRate.toFixed(1)} joins/min\``, inline: true },
        { name: 'Peak Join Rate', value: `\`${peakJoinRate} joins/min\``, inline: true }
      );

    if (raids.length > 0) {
      const raidList = raids.slice(0, 5).map((r, i) => {
        const time = r.timestamp ? `<t:${Math.floor(new Date(r.timestamp).getTime() / 1000)}:R>` : 'Unknown';
        return `**${i + 1}.** ${r.type || 'Unknown'} - ${r.accountsDetected || 0} accounts (${time})`;
      }).join('\n');
      embed.addFields({ name: 'Recent Raids', value: raidList });
    } else {
      embed.addFields({ name: 'Recent Raids', value: 'No raids detected in this period.' });
    }

    embed.setFooter({ text: `Requested by ${user.tag}` }).setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
