const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autoreact')
    .setDescription('Manage auto-reactions for message keywords')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Add an auto-reaction to a message keyword')
        .addStringOption(opt =>
          opt.setName('keyword')
            .setDescription('The keyword to trigger the reaction')
            .setRequired(true))
        .addStringOption(opt =>
          opt.setName('emoji')
            .setDescription('The emoji to react with')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('delete')
        .setDescription('Remove an auto-reaction')
        .addStringOption(opt =>
          opt.setName('keyword')
            .setDescription('The keyword to remove')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('edit')
        .setDescription('Edit an auto-reaction')
        .addStringOption(opt =>
          opt.setName('keyword')
            .setDescription('The keyword to edit')
            .setRequired(true))
        .addStringOption(opt =>
          opt.setName('emoji')
            .setDescription('The new emoji')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List all auto-reactions'))
    .addSubcommand(sub =>
      sub.setName('reset')
        .setDescription('Clear all auto-reactions')),

  cooldown: 5,
  aliases: ['ar', 'autoreact'],
  prefix: true,

  async execute(interaction, args) {
    const db = getDB();
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guildId = interaction.guild?.id;

    if (!guildId) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('This command can only be used in a server.')]
      });
    }

    if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('You need **Manage Messages** permission to use this command.')]
      });
    }

    await db.schema.hasTable('autoreacts').then(exists => {
      if (!exists) {
        return db.schema.createTable('autoreacts', table => {
          table.increments('id').primary();
          table.string('guild_id');
          table.string('keyword');
          table.string('emoji');
          table.timestamp('created_at').defaultTo(db.fn.now());
          table.index('guild_id');
        });
      }
    });

    const sub = isSlash ? interaction.options.getSubcommand() : (args?.[0] || '').toLowerCase();

    if (sub === 'create') {
      const keyword = isSlash ? interaction.options.getString('keyword') : args?.[1];
      const emoji = isSlash ? interaction.options.getString('emoji') : args?.[2];

      if (!keyword || !emoji) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xffa500).setDescription('Please provide a keyword and emoji.\nUsage: `!autoreact create <keyword> <emoji>`')]
        });
      }

      try {
        const existing = await db('autoreacts').where({ guild_id: guildId, keyword }).first();
        if (existing) {
          return interaction.reply({
            embeds: [new EmbedBuilder().setColor(0xffa500).setDescription(`An auto-reaction already exists for **${keyword}**. Use \`autoreact edit\` to update it.`)]
          });
        }

        await db('autoreacts').insert({ guild_id: guildId, keyword, emoji, created_at: new Date() });

        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('Auto-Reaction Created')
            .setDescription(`Successfully added auto-reaction:\n**Keyword:** ${keyword}\n**Emoji:** ${emoji}`)
            .setTimestamp()]
        });
      } catch (err) {
        console.error(err);
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('An error occurred while creating the auto-reaction.')]
        });
      }
    }

    if (sub === 'delete') {
      const keyword = isSlash ? interaction.options.getString('keyword') : args?.[1];

      if (!keyword) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xffa500).setDescription('Please provide a keyword.\nUsage: `!autoreact delete <keyword>`')]
        });
      }

      try {
        const result = await db('autoreacts').where({ guild_id: guildId, keyword }).del();

        if (result === 0) {
          return interaction.reply({
            embeds: [new EmbedBuilder().setColor(0xffa500).setDescription(`No auto-reaction found for **${keyword}**.`)]
          });
        }

        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('Auto-Reaction Deleted')
            .setDescription(`Successfully removed auto-reaction for **${keyword}**.`)
            .setTimestamp()]
        });
      } catch (err) {
        console.error(err);
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('An error occurred while deleting the auto-reaction.')]
        });
      }
    }

    if (sub === 'edit') {
      const keyword = isSlash ? interaction.options.getString('keyword') : args?.[1];
      const emoji = isSlash ? interaction.options.getString('emoji') : args?.[2];

      if (!keyword || !emoji) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xffa500).setDescription('Please provide a keyword and new emoji.\nUsage: `!autoreact edit <keyword> <emoji>`')]
        });
      }

      try {
        const result = await db('autoreacts').where({ guild_id: guildId, keyword }).update({ emoji });

        if (result === 0) {
          return interaction.reply({
            embeds: [new EmbedBuilder().setColor(0xffa500).setDescription(`No auto-reaction found for **${keyword}**. Use \`autoreact create\` to add one.`)]
          });
        }

        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('Auto-Reaction Updated')
            .setDescription(`Successfully updated auto-reaction for **${keyword}** to ${emoji}.`)
            .setTimestamp()]
        });
      } catch (err) {
        console.error(err);
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('An error occurred while editing the auto-reaction.')]
        });
      }
    }

    if (sub === 'list') {
      try {
        const rows = await db('autoreacts').where({ guild_id: guildId }).orderBy('id', 'asc');

        if (rows.length === 0) {
          return interaction.reply({
            embeds: [new EmbedBuilder().setColor(0x2f3136).setDescription('No auto-reactions configured for this server.')]
          });
        }

        const list = rows.map(r => `**${r.keyword}** → ${r.emoji}`).join('\n');
        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(0x2f3136)
            .setTitle('Auto-Reactions List')
            .setDescription(list)
            .setFooter({ text: `${rows.length} auto-reaction(s) total` })
            .setTimestamp()]
        });
      } catch (err) {
        console.error(err);
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('An error occurred while fetching auto-reactions.')]
        });
      }
    }

    if (sub === 'reset') {
      try {
        const result = await db('autoreacts').where({ guild_id: guildId }).del();

        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('Auto-Reactions Reset')
            .setDescription(`Successfully cleared all auto-reactions. Removed **${result}** entry/entries.`)
            .setTimestamp()]
        });
      } catch (err) {
        console.error(err);
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('An error occurred while resetting auto-reactions.')]
        });
      }
    }

    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x2f3136).setDescription('Invalid subcommand. Use `create`, `delete`, `edit`, `list`, or `reset`.')]
    });
  }
};
