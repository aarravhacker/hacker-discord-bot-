const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antibotvelocity')
    .setDescription('Bot join velocity analysis')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt =>
      opt.setName('minutes')
        .setDescription('Time window in minutes (default: 10)')
        .setMinValue(1)
        .setMaxValue(60)
    ),
  cooldown: 5,
  aliases: ['abvelocity'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permissions to use this command.', ephemeral: true });
    }

    const minutes = isSlash
      ? (interaction.options.getInteger('minutes') || 10)
      : (parseInt(args[0]) || 10);

    const velocityData = await securityEngine.getBotVelocity(interaction.guild.id, minutes);
    const totalJoins = velocityData.totalJoins || 0;
    const joinsPerMinute = velocityData.joinsPerMinute || 0;
    const peakVelocity = velocityData.peakVelocity || 0;
    const averageVelocity = velocityData.averageVelocity || 0;
    const isAbnormal = velocityData.isAbnormal || false;
    const velocityHistory = velocityData.history || [];

    const embed = new EmbedBuilder()
      .setTitle('Bot Join Velocity')
      .setDescription(`Bot join velocity for the last **${minutes}** minutes in **${interaction.guild.name}**`)
      .setColor(isAbnormal ? 0xff0000 : 0x00ff00)
      .addFields(
        { name: 'Total Bot Joins', value: `\`${totalJoins}\``, inline: true },
        { name: 'Current Rate', value: `\`${joinsPerMinute.toFixed(1)} joins/min\``, inline: true },
        { name: 'Peak Velocity', value: `\`${peakVelocity} joins/min\``, inline: true },
        { name: 'Average Velocity', value: `\`${averageVelocity.toFixed(1)} joins/min\``, inline: true },
        { name: 'Status', value: isAbnormal ? '🔴 **ABNORMAL**' : '🟢 **NORMAL**', inline: true }
      );

    if (velocityHistory.length > 0) {
      const historyList = velocityHistory.slice(-5).map(h => {
        const time = h.timestamp ? `<t:${Math.floor(new Date(h.timestamp).getTime() / 1000)}:t>` : 'N/A';
        return `${time} - \`${h.count || 0}\` bot joins`;
      }).join('\n');
      embed.addFields({ name: 'Recent Activity', value: historyList });
    }

    embed.setFooter({ text: `Requested by ${user.tag}` }).setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
