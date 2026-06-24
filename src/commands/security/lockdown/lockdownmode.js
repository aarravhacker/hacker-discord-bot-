const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

const MODES = {
  auto: { name: 'Auto', desc: 'Automatic lockdown triggers based on threat detection.', color: 0x57f287 },
  manual: { name: 'Manual', desc: 'Lockdown only activated by administrator commands.', color: 0xfee75c },
  graduated: { name: 'Graduated', desc: 'Progressive lockdown stages based on threat severity.', color: 0xffa500 }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lockdownmode')
    .setDescription('Set the lockdown mode')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('mode')
        .setDescription('Lockdown mode to set')
        .addChoices(
          { name: 'Auto', value: 'auto' },
          { name: 'Manual', value: 'manual' },
          { name: 'Graduated', value: 'graduated' }
        )
        .setRequired(true)
    ),
  cooldown: 5,
  aliases: ['ldmode', 'lockdownsetmode'],
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

    const mode = isSlash
      ? interaction.options.getString('mode')
      : (args[0] || '').toLowerCase();

    if (!mode || !MODES[mode]) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Invalid Mode')
        .setDescription('Available modes: `auto`, `manual`, `graduated`')
        .addFields(
          { name: 'Auto', value: 'Automatic lockdown triggers based on threat detection.', inline: false },
          { name: 'Manual', value: 'Lockdown only activated by administrator commands.', inline: false },
          { name: 'Graduated', value: 'Progressive lockdown stages based on threat severity.', inline: false }
        )
        .setColor(0xffa500)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    try {
      const previousMode = securityEngine.getStage(guild.id);
      securityEngine.setStage(guild.id, previousMode.stage || 0, `Mode changed to ${mode}`);
      securityEngine.logIncident(guild.id, user.id, 'lockdown_mode_changed', {
        previousMode: previousMode.name || 'Normal',
        newMode: MODES[mode].name,
        reason: `Set by ${user.tag}`
      });

      const modeData = MODES[mode];
      const embed = new EmbedBuilder()
        .setTitle('🔒 Lockdown Mode Updated')
        .setDescription(`Lockdown mode has been set to **${modeData.name}**.`)
        .addFields(
          { name: 'Mode', value: modeData.name, inline: true },
          { name: 'Description', value: modeData.desc, inline: false },
          { name: 'Set By', value: user.tag, inline: true }
        )
        .setColor(modeData.color)
        .setTimestamp()
        .setFooter({ text: `Guild: ${guild.name}`, iconURL: guild.iconURL() });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('Failed to set lockdown mode.')
        .setColor(0xff0000)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};
