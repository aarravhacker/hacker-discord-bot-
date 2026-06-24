const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Embed management system')
    .addSubcommand(sub => sub.setName('create').setDescription('Create and save an embed')
      .addStringOption(opt => opt.setName('name').setDescription('Embed name').setRequired(true))
      .addStringOption(opt => opt.setName('title').setDescription('Embed title'))
      .addStringOption(opt => opt.setName('description').setDescription('Embed description'))
      .addStringOption(opt => opt.setName('color').setDescription('Hex color (e.g. 00ff00)')))
    .addSubcommand(sub => sub.setName('delete').setDescription('Delete a saved embed')
      .addStringOption(opt => opt.setName('name').setDescription('Embed name').setRequired(true)))
    .addSubcommand(sub => sub.setName('edit').setDescription('Edit a saved embed')
      .addStringOption(opt => opt.setName('name').setDescription('Embed name').setRequired(true))
      .addStringOption(opt => opt.setName('title').setDescription('New title'))
      .addStringOption(opt => opt.setName('description').setDescription('New description'))
      .addStringOption(opt => opt.setName('color').setDescription('New hex color')))
    .addSubcommand(sub => sub.setName('list').setDescription('List all saved embeds'))
    .addSubcommand(sub => sub.setName('preview').setDescription('Preview a saved embed')
      .addStringOption(opt => opt.setName('name').setDescription('Embed name').setRequired(true)))
    .addSubcommand(sub => sub.setName('send').setDescription('Send a saved embed to a channel')
      .addStringOption(opt => opt.setName('name').setDescription('Embed name').setRequired(true))
      .addChannelOption(opt => opt.setName('channel').setDescription('Target channel').setRequired(true)))
    .addSubcommand(sub => sub.setName('friend').setDescription('Send a friendly embed')
      .addStringOption(opt => opt.setName('text').setDescription('Message text').setRequired(true))
      .addUserOption(opt => opt.setName('user').setDescription('User to mention'))),

  cooldown: 5,
  aliases: ['quickembed', 'embeds'],
  prefix: true,

  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;
    const guild = interaction.guild;
    const db = getDB();

    await db.schema.hasTable('saved_embeds').then(exists => {
      if (!exists) {
        return db.schema.createTable('saved_embeds', table => {
          table.increments('id').primary();
          table.string('guild_id');
          table.string('user_id');
          table.string('name');
          table.string('title');
          table.text('description');
          table.string('color').defaultTo('0x2f3136');
          table.timestamps(true, true);
          table.index('guild_id');
          table.index('name');
        });
      }
    });

    let subcommand;
    if (isSlash) {
      subcommand = interaction.options.getSubcommand();
    } else {
      subcommand = (args?.[0] || 'list').toLowerCase();
    }

    try {
      if (subcommand === 'create') {
        const name = isSlash ? interaction.options.getString('name') : args?.[1];
        const title = isSlash ? interaction.options.getString('title') : args?.[2] || '';
        const description = isSlash ? interaction.options.getString('description') : args?.slice(3).join(' ') || '';
        const color = isSlash ? interaction.options.getString('color') : '0x2f3136';

        if (!name) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xffa500).setTitle('⚠️ Usage').setDescription('`!embed create <name> [title] [description]`').setTimestamp()] });

        const existing = await db('saved_embeds').where({ guild_id: guild.id, name }).first();
        if (existing) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xffa500).setTitle('⚠️ Warning').setDescription('An embed with this name already exists.').setTimestamp()] });

        await db('saved_embeds').insert({ guild_id: guild.id, user_id: user.id, name, title, description, color });
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setTitle('✅ Embed Created').setDescription(`Embed **${name}** has been saved.`).setTimestamp()] });
      }

      if (subcommand === 'delete') {
        const name = isSlash ? interaction.options.getString('name') : args?.[1];
        if (!name) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xffa500).setTitle('⚠️ Usage').setDescription('`!embed delete <name>`').setTimestamp()] });
        const deleted = await db('saved_embeds').where({ guild_id: guild.id, name }).del();
        if (!deleted) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setTitle('❌ Error').setDescription('Embed not found.').setTimestamp()] });
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setTitle('✅ Embed Deleted').setDescription(`Embed **${name}** has been deleted.`).setTimestamp()] });
      }

      if (subcommand === 'edit') {
        const name = isSlash ? interaction.options.getString('name') : args?.[1];
        if (!name) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xffa500).setTitle('⚠️ Usage').setDescription('`!embed edit <name> [title] [description] [color]`').setTimestamp()] });
        const updates = {};
        if (isSlash) {
          if (interaction.options.getString('title')) updates.title = interaction.options.getString('title');
          if (interaction.options.getString('description')) updates.description = interaction.options.getString('description');
          if (interaction.options.getString('color')) updates.color = interaction.options.getString('color');
        }
        const updated = await db('saved_embeds').where({ guild_id: guild.id, name }).update(updates);
        if (!updated) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setTitle('❌ Error').setDescription('Embed not found.').setTimestamp()] });
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setTitle('✅ Embed Updated').setDescription(`Embed **${name}** has been updated.`).setTimestamp()] });
      }

      if (subcommand === 'list') {
        const embeds = await db('saved_embeds').where({ guild_id: guild.id });
        if (embeds.length === 0) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x2f3136).setTitle('📋 Saved Embeds').setDescription('No embeds saved.').setTimestamp()] });
        const list = embeds.map(e => `**${e.name}** - ${e.title || 'No title'}`).join('\n');
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setTitle('📋 Saved Embeds').setDescription(list).setTimestamp()] });
      }

      if (subcommand === 'preview') {
        const name = isSlash ? interaction.options.getString('name') : args?.[1];
        if (!name) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xffa500).setTitle('⚠️ Usage').setDescription('`!embed preview <name>`').setTimestamp()] });
        const embedData = await db('saved_embeds').where({ guild_id: guild.id, name }).first();
        if (!embedData) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setTitle('❌ Error').setDescription('Embed not found.').setTimestamp()] });
        const color = parseInt(embedData.color) || 0x2f3136;
        const embed = new EmbedBuilder().setColor(color).setTimestamp();
        if (embedData.title) embed.setTitle(embedData.title);
        if (embedData.description) embed.setDescription(embedData.description);
        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'send') {
        const name = isSlash ? interaction.options.getString('name') : args?.[1];
        const channel = isSlash ? interaction.options.getChannel('channel') : guild.channels.cache.get(args?.[2]?.replace(/[<#>]/g, ''));
        if (!name || !channel) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xffa500).setTitle('⚠️ Usage').setDescription('`!embed send <name> <channel>`').setTimestamp()] });
        const embedData = await db('saved_embeds').where({ guild_id: guild.id, name }).first();
        if (!embedData) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setTitle('❌ Error').setDescription('Embed not found.').setTimestamp()] });
        const color = parseInt(embedData.color) || 0x2f3136;
        const embed = new EmbedBuilder().setColor(color).setTimestamp();
        if (embedData.title) embed.setTitle(embedData.title);
        if (embedData.description) embed.setDescription(embedData.description);
        await channel.send({ embeds: [embed] });
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setTitle('✅ Embed Sent').setDescription(`Embed **${name}** sent to ${channel}.`).setTimestamp()] });
      }

      if (subcommand === 'friend') {
        const text = isSlash ? interaction.options.getString('text') : args?.slice(1).join(' ');
        const target = isSlash ? interaction.options.getUser('user') : user;
        if (!text) return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xffa500).setTitle('⚠️ Usage').setDescription('`!embed friend <text> [user]`').setTimestamp()] });
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('👋 Friend')
          .setDescription(text)
          .setFooter({ text: `Sent by ${user.tag}`, iconURL: user.displayAvatarURL() })
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      }

    } catch (error) {
      console.error(error);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setTitle('❌ Error').setDescription(`Failed: ${error.message}`).setTimestamp()] });
    }
  }
};
