const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

const STAGES = [
  { name: 'Normal', color: 0x57f287, desc: 'No threats detected. Normal operations.' },
  { name: 'Alert', color: 0xfee75c, desc: 'Potential threat detected. Enhanced monitoring active.' },
  { name: 'Restrict', color: 0xffa500, desc: 'Moderate threat. Staff actions limited.' },
  { name: 'Quarantine', color: 0xffa500, desc: 'High threat. Suspicious actors isolated.' },
  { name: 'Lockdown', color: 0xed4245, desc: 'Critical threat. All non-essential actions blocked.' },
  { name: 'Recovery', color: 0x57f287, desc: 'Post-incident. Restoring normal operations.' }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stage')
    .setDescription('Set or view the multi-stage anti-nuke system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set the current stage')
        .addIntegerOption(opt =>
          opt.setName('stage').setDescription('Stage number (0-5)').setRequired(true).setMinValue(0).setMaxValue(5)
        )
        .addStringOption(opt =>
          opt.setName('reason').setDescription('Reason for stage change')
        )
    )
    .addSubcommand(sub =>
      sub.setName('view').setDescription('Show current stage')
    ),
  cooldown: 5,
  aliases: ['securitystage', 'ss'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setDescription('You need Administrator permission to use this command.');
      return interaction.reply({ embeds: [embed] });
    }

    const subcommand = isSlash ? interaction.options.getSubcommand() : (args[0] || '').toLowerCase();

    if (subcommand === 'view' || subcommand === 'status') {
      const current = await securityEngine.getStage(interaction.guild.id);
      const stageIndex = current?.stage ?? 0;
      const stage = STAGES[stageIndex] || STAGES[0];

      const embed = new EmbedBuilder()
        .setColor(stage.color)
        .setTitle(`Security Stage: ${stage.name}`)
        .setDescription(stage.desc)
        .addFields(
          { name: 'Stage Number', value: `${stageIndex}`, inline: true },
          { name: 'Set By', value: current?.setBy || 'System', inline: true },
          { name: 'Reason', value: current?.reason || 'None specified', inline: false }
        )
        .setTimestamp();

      if (current?.lastChanged) {
        embed.addFields({
          name: 'Last Changed',
          value: `<t:${Math.floor(current.lastChanged / 1000)}:R>`,
          inline: true
        });
      }

      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'set') {
      const stageIndex = isSlash
        ? interaction.options.getInteger('stage')
        : parseInt(args[1]);

      if (isNaN(stageIndex) || stageIndex < 0 || stageIndex > 5) {
        const embed = new EmbedBuilder()
          .setColor(0xffa500)
          .setDescription('Please provide a valid stage number between 0 and 5.');
        return interaction.reply({ embeds: [embed] });
      }

      const reason = isSlash
        ? interaction.options.getString('reason') || 'No reason provided'
        : args.slice(2).join(' ') || 'No reason provided';

      await securityEngine.setStage(interaction.guild.id, stageIndex, user.tag, reason);
      const stage = STAGES[stageIndex];

      const embed = new EmbedBuilder()
        .setColor(stage.color)
        .setTitle(`Stage Updated: ${stage.name}`)
        .setDescription(`Security stage has been changed to **${stage.name}** (Stage ${stageIndex}).`)
        .addFields(
          { name: 'Previous Stage', value: current?.stage !== undefined ? STAGES[current.stage]?.name || 'Unknown' : 'None', inline: true },
          { name: 'New Stage', value: stage.name, inline: true },
          { name: 'Changed By', value: `${user.tag}`, inline: true },
          { name: 'Reason', value: reason, inline: false }
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
      .setColor(0xffa500)
      .setDescription('Invalid subcommand. Use `set <stage> [reason]` or `view`.');
    return interaction.reply({ embeds: [embed] });
  }
};
