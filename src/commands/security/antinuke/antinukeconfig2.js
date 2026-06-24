const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukeconfig2')
    .setDescription('Advanced antinuke configuration')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('view').setDescription('View advanced configuration'))
    .addSubcommand(sub => sub.setName('set').setDescription('Set a configuration value')
      .addStringOption(opt => opt.setName('key').setDescription('Configuration key').setRequired(true))
      .addStringOption(opt => opt.setName('value').setDescription('Configuration value').setRequired(true)))
    .addSubcommand(sub => sub.setName('reset').setDescription('Reset configuration to defaults'))
    .addSubcommand(sub => sub.setName('export').setDescription('Export configuration')),

  cooldown: 10,
  aliases: ['anconfig2', 'aconfig2'],
  prefix: true,
  ownerOnly: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;

    if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Permission Denied')
        .setDescription('You need Administrator permission to use this command.')
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    const subcommand = isSlash ? interaction.options.getSubcommand() : (args[0] || 'view');
    const validSubs = ['view', 'set', 'reset', 'export'];
    if (!validSubs.includes(subcommand)) {
      const embed = new EmbedBuilder()
        .setColor(0xff9900)
        .setTitle('⚠️ Invalid Subcommand')
        .setDescription(`Valid subcommands: ${validSubs.join(', ')}`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    try {
      if (subcommand === 'view') {
        const config = await securityEngine.getAdvancedConfig(interaction.guild.id);
        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle('⚙️ Advanced Configuration')
          .setDescription('Current advanced antinuke configuration.')
          .setTimestamp();

        if (config && typeof config === 'object') {
          for (const [key, val] of Object.entries(config)) {
            const displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
            embed.addFields({ name: key, value: displayVal.substring(0, 100), inline: true });
          }
        } else {
          embed.setDescription('Using default configuration.');
        }

        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'set') {
        const key = isSlash ? interaction.options.getString('key') : args[1];
        const value = isSlash ? interaction.options.getString('value') : args.slice(2).join(' ');
        if (!key || !value) {
          const embed = new EmbedBuilder()
            .setColor(0xff9900)
            .setTitle('⚠️ Missing Parameters')
            .setDescription('Please provide both key and value.')
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }
        await securityEngine.setAdvancedConfig(interaction.guild.id, key, value);
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('⚙️ Configuration Updated')
          .setDescription(`Configuration key \`${key}\` has been updated.`)
          .addFields(
            { name: 'Key', value: key, inline: true },
            { name: 'Value', value: value.substring(0, 100), inline: true },
            { name: 'Updated By', value: user.tag, inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'reset') {
        await securityEngine.resetAdvancedConfig(interaction.guild.id);
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('⚙️ Configuration Reset')
          .setDescription('Advanced configuration has been reset to defaults.')
          .addFields({ name: 'Reset By', value: user.tag, inline: true })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'export') {
        const config = await securityEngine.exportConfig(interaction.guild.id);
        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle('⚙️ Configuration Export')
          .setDescription('Configuration has been exported. Below is the JSON configuration.')
          .setTimestamp();

        const configStr = JSON.stringify(config, null, 2);
        if (configStr.length > 1000) {
          embed.addFields({ name: 'Config (Part 1)', value: configStr.substring(0, 1000) });
          if (configStr.length > 1000) {
            embed.addFields({ name: 'Config (Part 2)', value: configStr.substring(1000, 2000) });
          }
        } else {
          embed.addFields({ name: 'Configuration', value: `\`\`\`json\n${configStr}\n\`\`\`` });
        }

        embed.addFields({ name: 'Exported By', value: user.tag, inline: true });
        return interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Error')
        .setDescription(`Configuration operation failed: ${error.message}`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  }
};
