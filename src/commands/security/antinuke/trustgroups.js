const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

const GROUPS = {
  newcomer: { level: 1, name: 'Newcomer', desc: 'Brand new members with minimal trust.', color: 0x95a5a6 },
  known: { level: 2, name: 'Known', desc: 'Members with basic trust established.', color: 0xf1c40f },
  established: { level: 3, name: 'Established', desc: 'Members with solid trust history.', color: 0x2ecc71 },
  trusted: { level: 4, name: 'Trusted', desc: 'Highly trusted members with full access.', color: 0x3498db },
  veteran: { level: 5, name: 'Veteran', desc: 'Most trusted long-standing members.', color: 0x9b59b6 }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trustgroups')
    .setDescription('View trust groups')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('newcomer').setDescription('View newcomers (Level 1)')
    )
    .addSubcommand(sub =>
      sub.setName('known').setDescription('View known members (Level 2)')
    )
    .addSubcommand(sub =>
      sub.setName('established').setDescription('View established members (Level 3)')
    )
    .addSubcommand(sub =>
      sub.setName('trusted').setDescription('View trusted members (Level 4)')
    )
    .addSubcommand(sub =>
      sub.setName('veteran').setDescription('View veterans (Level 5)')
    ),
  cooldown: 5,
  aliases: ['trgroups', 'trustlist'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;
    const guild = interaction.guild;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setDescription('You need Administrator permission to use this command.');
      return interaction.reply({ embeds: [embed] });
    }

    const subcommand = isSlash ? interaction.options.getSubcommand() : (args[0] || '').toLowerCase();

    try {
      const group = GROUPS[subcommand];
      if (!group) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Invalid Group')
          .setDescription('Available groups: `newcomer`, `known`, `established`, `trusted`, `veteran`')
          .setColor(0xffa500)
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      const membersAtLevel = [];
      guild.members.cache.forEach((m) => {
        if (m.user.bot) return;
        const trustLevel = securityEngine.getTrustLevel(guild.id, m.id);
        if (trustLevel.level === group.level) {
          membersAtLevel.push({
            member: m,
            trust: trustLevel
          });
        }
      });

      membersAtLevel.sort((a, b) => b.trust.score - a.trust.score);

      const embed = new EmbedBuilder()
        .setTitle(`${group.name} Trust Group`)
        .setDescription(`${group.desc}\n**${membersAtLevel.length}** member(s) in this group.`)
        .setColor(group.color)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() })
        .addFields(
          { name: 'Trust Level', value: `Level ${group.level}`, inline: true },
          { name: 'Members', value: `${membersAtLevel.length}`, inline: true },
          { name: 'Score Range', value: group.level === 1 ? '0-19' : group.level === 2 ? '20-39' : group.level === 3 ? '40-59' : group.level === 4 ? '60-79' : '80-100', inline: true }
        );

      if (membersAtLevel.length > 0) {
        const memberList = membersAtLevel.slice(0, 15).map((data, i) =>
          `**${i + 1}.** ${data.member.user.tag} — Score: **${data.trust.score}**${data.trust.isFlagged ? ' ⚠️' : ''}`
        ).join('\n');
        embed.addFields({ name: '👥 Members', value: memberList, inline: false });

        if (membersAtLevel.length > 15) {
          embed.addFields({ name: '... and more', value: `And **${membersAtLevel.length - 15}** more members.`, inline: false });
        }
      } else {
        embed.addFields({ name: '👥 Members', value: 'No members in this group.', inline: false });
      }

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to load trust group.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
