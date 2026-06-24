const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

const POLICIES = {
  strict: { name: 'Strict', desc: 'Aggressive trust requirements. New members have very limited permissions.', color: 0xed4245 },
  moderate: { name: 'Moderate', desc: 'Balanced trust requirements. Standard permission progression.', color: 0xffa500 },
  relaxed: { name: 'Relaxed', desc: 'Minimal trust requirements. Most permissions available immediately.', color: 0x57f287 },
  custom: { name: 'Custom', desc: 'Custom trust policy configured by administrators.', color: 0x5865f2 }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trustpolicy')
    .setDescription('Set the trust policy')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set the trust policy')
        .addStringOption(opt =>
          opt.setName('policy')
            .setDescription('Trust policy to set')
            .addChoices(
              { name: 'Strict', value: 'strict' },
              { name: 'Moderate', value: 'moderate' },
              { name: 'Relaxed', value: 'relaxed' },
              { name: 'Custom', value: 'custom' }
            )
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('view').setDescription('View current trust policy')
    ),
  cooldown: 5,
  aliases: ['trpolicy', 'trustsetpolicy'],
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
      const policySettings = securityEngine.profiles.get(`trustPolicy:${guild.id}`) || {
        policy: 'moderate',
        customThresholds: {},
        lastChanged: null
      };

      if (subcommand === 'set') {
        const policy = isSlash ? interaction.options.getString('policy') : (args[1] || '').toLowerCase();

        if (!policy || !POLICIES[policy]) {
          const embed = new EmbedBuilder()
            .setTitle('❌ Invalid Policy')
            .setDescription('Available policies: `strict`, `moderate`, `relaxed`, `custom`')
            .setColor(0xffa500)
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }

        const previousPolicy = policySettings.policy;
        policySettings.policy = policy;
        policySettings.lastChanged = Date.now();
        securityEngine.profiles.set(`trustPolicy:${guild.id}`, policySettings);

        securityEngine.logIncident(guild.id, user.id, 'trust_policy_changed', {
          previousPolicy,
          newPolicy: policy,
          changedBy: user.tag
        });

        const policyData = POLICIES[policy];
        const embed = new EmbedBuilder()
          .setTitle('✅ Trust Policy Updated')
          .setDescription(`Trust policy has been set to **${policyData.name}**.`)
          .setColor(policyData.color)
          .setTimestamp()
          .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() })
          .addFields(
            { name: 'Policy', value: policyData.name, inline: true },
            { name: 'Description', value: policyData.desc, inline: false },
            { name: 'Changed By', value: user.tag, inline: true }
          );

        if (policy === 'strict') {
          embed.addFields({
            name: '📋 Strict Policy Details',
            value: '• Trust threshold for full access: **60**\n• Auto-flag threshold: **30**\n• New member restrictions: **High**\n• Trust gain rate: **Slow**',
            inline: false
          });
        } else if (policy === 'moderate') {
          embed.addFields({
            name: '📋 Moderate Policy Details',
            value: '• Trust threshold for full access: **40**\n• Auto-flag threshold: **20**\n• New member restrictions: **Medium**\n• Trust gain rate: **Normal**',
            inline: false
          });
        } else if (policy === 'relaxed') {
          embed.addFields({
            name: '📋 Relaxed Policy Details',
            value: '• Trust threshold for full access: **20**\n• Auto-flag threshold: **10**\n• New member restrictions: **Low**\n• Trust gain rate: **Fast**',
            inline: false
          });
        }

        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'view') {
        const currentPolicy = POLICIES[policySettings.policy] || POLICIES.moderate;

        const embed = new EmbedBuilder()
          .setTitle('📋 Trust Policy')
          .setDescription(`Current trust policy for **${guild.name}**.`)
          .setColor(currentPolicy.color)
          .setTimestamp()
          .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() })
          .addFields(
            { name: 'Current Policy', value: currentPolicy.name, inline: true },
            { name: 'Description', value: currentPolicy.desc, inline: false }
          );

        if (policySettings.lastChanged) {
          embed.addFields({
            name: 'Last Changed',
            value: `<t:${Math.floor(policySettings.lastChanged / 1000)}:R>`,
            inline: true
          });
        }

        const allPolicies = Object.entries(POLICIES).map(([key, val]) =>
          `${key === policySettings.policy ? '➡️' : '•'} **${val.name}**: ${val.desc}`
        ).join('\n');
        embed.addFields({ name: 'Available Policies', value: allPolicies, inline: false });

        return interaction.reply({ embeds: [embed] });
      }

      const embed = new EmbedBuilder()
        .setTitle('❌ Invalid Subcommand')
        .setDescription('Available subcommands: `set`, `view`')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to manage trust policy.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
