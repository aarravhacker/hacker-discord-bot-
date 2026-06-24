const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antiraidgroups')
    .setDescription('Detect and manage raid groups')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['argroups'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permissions to use this command.', ephemeral: true });
    }

    const groupsData = await securityEngine.getRaidGroups(interaction.guild.id);
    const groups = groupsData.groups || [];
    const totalGroups = groups.length;
    const activeGroups = groups.filter(g => g.active).length;
    const totalMembers = groups.reduce((sum, g) => sum + (g.memberCount || 0), 0);

    const embed = new EmbedBuilder()
      .setTitle('Raid Groups Detection')
      .setDescription(`Raid groups detected in **${interaction.guild.name}**`)
      .setColor(0xff4400)
      .addFields(
        { name: 'Total Groups', value: `\`${totalGroups}\``, inline: true },
        { name: 'Active Groups', value: `\`${activeGroups}\``, inline: true },
        { name: 'Total Members in Groups', value: `\`${totalMembers}\``, inline: true }
      );

    if (groups.length > 0) {
      groups.slice(0, 8).forEach((group, i) => {
        const status = group.active ? '🔴 Active' : '🟢 Inactive';
        const members = group.members ? group.members.slice(0, 5).map(m => `<@${m}>`).join(', ') : 'None';
        embed.addFields({
          name: `${i + 1}. ${group.name || `Group ${i + 1}`}`,
          value: [
            `**Status:** ${status}`,
            `**Members:** ${group.memberCount || 0}`,
            `**Joined Around:** ${group.joinWindow || 'N/A'}`,
            `**Top Members:** ${members}`
          ].join('\n')
        });
      });
    } else {
      embed.addFields({ name: 'Groups', value: 'No raid groups currently detected.' });
    }

    embed.setFooter({ text: `Requested by ${user.tag}` }).setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
