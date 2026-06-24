const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const securityEngine = require('../../../utils/securityEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backupcreate')
    .setDescription('Create a full server backup')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('name').setDescription('Backup name')
    ),
  cooldown: 5,
  aliases: ['backup', 'bk'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const user = isSlash ? interaction.user : interaction.author;
    const guild = interaction.guild;

    try {
      if (!member || !member.permissions.has(PermissionFlagsBits.Administrator)) {
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setDescription('You need Administrator permission to use this command.');
        return interaction.reply({ embeds: [embed] });
      }

      const name = isSlash
        ? interaction.options.getString('name')
        : args.slice(0).join(' ') || `backup_${Date.now()}`;

      const loadingEmbed = new EmbedBuilder()
        .setColor(0xfee75c)
        .setDescription('🔄 Creating full server backup... This may take a moment.')
        .setTimestamp();
      await interaction.reply({ embeds: [loadingEmbed] });

      const snapshot = await securityEngine.createSnapshot(guild.id, interaction.client);

      if (!snapshot) {
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setDescription('Failed to create backup. Please try again.');
        return interaction.editReply({ embeds: [embed] });
      }

      if (!global.serverBackups) global.serverBackups = {};
      if (!global.serverBackups[guild.id]) global.serverBackups[guild.id] = [];

      const backup = {
        id: `bk_${Date.now()}`,
        name: name,
        snapshot: snapshot,
        createdBy: user.tag,
        createdAt: Date.now(),
        channelCount: snapshot.channels?.length || 0,
        roleCount: snapshot.roles?.length || 0,
        memberCount: snapshot.members?.length || 0
      };

      global.serverBackups[guild.id].push(backup);

      if (global.serverBackups[guild.id].length > 20) {
        global.serverBackups[guild.id] = global.serverBackups[guild.id].slice(-20);
      }

      const embed = new EmbedBuilder()
        .setTitle('✅ Backup Created')
        .setDescription(`Full server backup **${name}** has been created successfully.`)
        .setColor(0x57f287)
        .addFields(
          { name: 'Backup ID', value: `\`${backup.id}\``, inline: true },
          { name: 'Name', value: name, inline: true },
          { name: 'Created By', value: `${user.tag}`, inline: true },
          { name: 'Channels', value: `**${backup.channelCount}**`, inline: true },
          { name: 'Roles', value: `**${backup.roleCount}**`, inline: true },
          { name: 'Members', value: `**${backup.memberCount}**`, inline: true },
          { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setTimestamp();
      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while creating the backup.')
        .setColor(0xff0000)
        .setTimestamp();
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
