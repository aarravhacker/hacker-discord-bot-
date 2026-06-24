const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antibotpatterns')
    .setDescription('View bot attack patterns')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['abpatterns'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permissions to use this command.', ephemeral: true });
    }

    const patternsData = await securityEngine.getBotPatterns(interaction.guild.id);
    const patterns = patternsData.patterns || [];
    const totalDetections = patternsData.totalDetections || 0;
    const lastDetection = patternsData.lastDetection;

    const embed = new EmbedBuilder()
      .setTitle('Bot Attack Patterns')
      .setDescription(`Bot patterns detected in **${interaction.guild.name}**`)
      .setColor(0xff8800)
      .addFields(
        { name: 'Total Detections', value: `\`${totalDetections}\``, inline: true },
        { name: 'Active Patterns', value: `\`${patterns.length}\``, inline: true },
        { name: 'Last Detection', value: lastDetection ? `<t:${Math.floor(new Date(lastDetection).getTime() / 1000)}:R>` : 'None', inline: true }
      );

    if (patterns.length > 0) {
      patterns.slice(0, 10).forEach((pattern, i) => {
        const confidence = pattern.confidence ? `${(pattern.confidence * 100).toFixed(0)}%` : 'N/A';
        embed.addFields({
          name: `${i + 1}. ${pattern.type || 'Unknown Pattern'}`,
          value: [
            `**Description:** ${pattern.description || 'No description'}`,
            `**Confidence:** ${confidence}`,
            `**First Seen:** ${pattern.firstSeen ? `<t:${Math.floor(new Date(pattern.firstSeen).getTime() / 1000)}:R>` : 'N/A'}`,
            `**Bots Involved:** ${pattern.botsInvolved || 0}`
          ].join('\n')
        });
      });
    } else {
      embed.addFields({ name: 'Patterns', value: 'No bot attack patterns currently detected.' });
    }

    embed.setFooter({ text: `Requested by ${user.tag}` }).setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
