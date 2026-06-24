const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antiraidpolicy')
    .setDescription('Set raid policy')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set the raid policy')
        .addStringOption(opt =>
          opt.setName('policy')
            .setDescription('Raid policy to set')
            .setRequired(true)
            .addChoices(
              { name: 'Kick - Kick suspected raiders', value: 'kick' },
              { name: 'Ban - Ban suspected raiders', value: 'ban' },
              { name: 'Mute - Mute suspected raiders', value: 'mute' },
              { name: 'Verify - Require verification', value: 'verify' },
              { name: 'Lockdown - Lock server on raid', value: 'lockdown' },
              { name: 'Alert - Only send alert', value: 'alert' }
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View current raid policy')
    ),
  cooldown: 5,
  aliases: ['rpolicy'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permissions to use this command.', ephemeral: true });
    }

    const subcommand = isSlash ? interaction.options.getSubcommand() : (args[0] || 'view');

    if (subcommand === 'view') {
      const policy = await securityEngine.getRaidPolicy(interaction.guild.id);
      const embed = new EmbedBuilder()
        .setTitle('Current Raid Policy')
        .setDescription(`Raid policy for **${interaction.guild.name}**`)
        .setColor(0x0099ff)
        .addFields(
          { name: 'Active Policy', value: `\`${(policy.active || 'alert').toUpperCase()}\``, inline: true },
          { name: 'Auto-Enforce', value: policy.autoEnforce ? 'Yes' : 'No', inline: true },
          { name: 'Threshold', value: `\`${policy.threshold || 5} joins/min\``, inline: true },
          { name: 'Duration', value: `\`${policy.duration || 60}s window\``, inline: true }
        )
        .setFooter({ text: `Requested by ${user.tag}` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'set') {
      const policyValue = isSlash
        ? interaction.options.getString('policy')
        : (args[0] || 'alert');

      await securityEngine.setRaidPolicy(interaction.guild.id, {
        active: policyValue,
        autoEnforce: true,
        threshold: 5,
        duration: 60,
        setBy: user.id,
        setAt: Date.now()
      });

      const embed = new EmbedBuilder()
        .setTitle('Raid Policy Updated')
        .setDescription(`Raid policy for **${interaction.guild.name}** has been updated.`)
        .setColor(0x00ff00)
        .addFields(
          { name: 'New Policy', value: `\`${policyValue.toUpperCase()}\``, inline: true },
          { name: 'Set By', value: `<@${user.id}>`, inline: true }
        )
        .setFooter({ text: `Requested by ${user.tag}` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    return interaction.reply({ content: 'Invalid subcommand. Use `set` or `view`.', ephemeral: true });
  }
};
