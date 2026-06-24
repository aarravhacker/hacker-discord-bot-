const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukeautomations')
    .setDescription('List all automations')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('list').setDescription('List all automations'))
    .addSubcommand(sub => sub.setName('enable').setDescription('Enable an automation')
      .addStringOption(opt => opt.setName('automation').setDescription('Automation to enable').setRequired(true)))
    .addSubcommand(sub => sub.setName('disable').setDescription('Disable an automation')
      .addStringOption(opt => opt.setName('automation').setDescription('Automation to disable').setRequired(true))),

  cooldown: 5,
  aliases: ['anautomations', 'aautomations'],
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

    const subcommand = isSlash ? interaction.options.getSubcommand() : (args[0] || 'list');
    const validSubs = ['list', 'enable', 'disable'];
    if (!validSubs.includes(subcommand)) {
      const embed = new EmbedBuilder()
        .setColor(0xff9900)
        .setTitle('⚠️ Invalid Subcommand')
        .setDescription(`Valid subcommands: ${validSubs.join(', ')}`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    try {
      if (subcommand === 'list') {
        const automations = await securityEngine.getAutomations(interaction.guild.id);
        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle('🤖 Antinuke Automations')
          .setDescription('All configured automations for this server.')
          .setTimestamp();

        if (automations?.length) {
          automations.forEach(auto => {
            embed.addFields({
              name: `${auto.enabled ? '✅' : '❌'} ${auto.name}`,
              value: auto.description || 'No description',
              inline: true
            });
          });
        } else {
          embed.addFields({ name: 'Automations', value: 'No automations configured.' });
        }

        const activeCount = automations?.filter(a => a.enabled).length || 0;
        embed.addFields(
          { name: 'Total', value: String(automations?.length || 0), inline: true },
          { name: 'Active', value: String(activeCount), inline: true }
        );

        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'enable') {
        const automation = isSlash ? interaction.options.getString('automation') : args[1];
        if (!automation) {
          const embed = new EmbedBuilder()
            .setColor(0xff9900)
            .setTitle('⚠️ Missing Automation')
            .setDescription('Please specify an automation to enable.')
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }
        await securityEngine.enableAutomation(interaction.guild.id, automation);
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('✅ Automation Enabled')
          .setDescription(`Automation \`${automation}\` has been enabled.`)
          .addFields({ name: 'Enabled By', value: user.tag, inline: true })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'disable') {
        const automation = isSlash ? interaction.options.getString('automation') : args[1];
        if (!automation) {
          const embed = new EmbedBuilder()
            .setColor(0xff9900)
            .setTitle('⚠️ Missing Automation')
            .setDescription('Please specify an automation to disable.')
            .setTimestamp();
          return interaction.reply({ embeds: [embed] });
        }
        await securityEngine.disableAutomation(interaction.guild.id, automation);
        const embed = new EmbedBuilder()
          .setColor(0xff9900)
          .setTitle('❌ Automation Disabled')
          .setDescription(`Automation \`${automation}\` has been disabled.`)
          .addFields({ name: 'Disabled By', value: user.tag, inline: true })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Error')
        .setDescription(`Automation operation failed: ${error.message}`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  }
};
