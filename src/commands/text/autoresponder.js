const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autoresponder')
    .setDescription('Manage auto-responses for message triggers')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Create an auto-response')
        .addStringOption(opt =>
          opt.setName('trigger')
            .setDescription('The trigger text')
            .setRequired(true))
        .addStringOption(opt =>
          opt.setName('response')
            .setDescription('The response message')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('delete')
        .setDescription('Delete an auto-response')
        .addStringOption(opt =>
          opt.setName('trigger')
            .setDescription('The trigger text to remove')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('edit')
        .setDescription('Edit an auto-response')
        .addStringOption(opt =>
          opt.setName('trigger')
            .setDescription('The trigger text to edit')
            .setRequired(true))
        .addStringOption(opt =>
          opt.setName('response')
            .setDescription('The new response message')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List all auto-responses'))
    .addSubcommand(sub =>
      sub.setName('reset')
        .setDescription('Clear all auto-responses')),

  cooldown: 5,
  aliases: ['ar', 'autorespond'],
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

    await db.schema.hasTable('autoresponders').then(exists => {
      if (!exists) {
        return db.schema.createTable('autoresponders', table => {
          table.increments('id').primary();
          table.string('guild_id');
          table.string('trigger_text');
          table.text('response');
          table.timestamp('created_at').defaultTo(db.fn.now());
          table.index('guild_id');
        });
      }
    });

    const sub = isSlash ? interaction.options.getSubcommand() : (args?.[0] || '').toLowerCase();

    if (sub === 'create') {
      const trigger = isSlash ? interaction.options.getString('trigger') : args?.slice(1).join(' ');
      const response = isSlash ? interaction.options.getString('response') : null;

      if (!trigger) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xffa500).setDescription('Please provide a trigger text.\nUsage: `!autoresponder create <trigger> | <response>`')]
        });
      }

      if (!isSlash && !response) {
        const parts = trigger.split('|');
        if (parts.length < 2) {
          return interaction.reply({
            embeds: [new EmbedBuilder().setColor(0xffa500).setDescription('Please provide a response.\nUsage: `!autoresponder create <trigger> | <response>`')]
          });
        }
      }

      let triggerText, responseText;
      if (isSlash) {
        triggerText = trigger;
        responseText = response;
      } else {
        const parts = trigger.split('|');
        triggerText = parts[0].trim();
        responseText = parts.slice(1).join('|').trim();
      }

      if (!triggerText || !responseText) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xffa500).setDescription('Both trigger and response are required.\nUsage: `!autoresponder create <trigger> | <response>`')]
        });
      }

      try {
        const existing = await db('autoresponders').where({ guild_id: guildId, trigger_text: triggerText }).first();
        if (existing) {
          return interaction.reply({
            embeds: [new EmbedBuilder().setColor(0xffa500).setDescription(`An auto-response already exists for **${triggerText}**. Use \`autoresponder edit\` to update it.`)]
          });
        }

        await db('autoresponders').insert({
          guild_id: guildId,
          trigger_text: triggerText,
          response: responseText,
          created_at: new Date()
        });

        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('Auto-Response Created')
            .setDescription(`Successfully added auto-response:\n**Trigger:** ${triggerText}\n**Response:** ${responseText.substring(0, 1000)}${responseText.length > 1000 ? '...' : ''}`)
            .setTimestamp()]
        });
      } catch (err) {
        console.error(err);
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('An error occurred while creating the auto-response.')]
        });
      }
    }

    if (sub === 'delete') {
      const trigger = isSlash ? interaction.options.getString('trigger') : args?.slice(1).join(' ');

      if (!trigger) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xffa500).setDescription('Please provide a trigger text.\nUsage: `!autoresponder delete <trigger>`')]
        });
      }

      try {
        const result = await db('autoresponders').where({ guild_id: guildId, trigger_text: trigger }).del();

        if (result === 0) {
          return interaction.reply({
            embeds: [new EmbedBuilder().setColor(0xffa500).setDescription(`No auto-response found for **${trigger}**.`)]
          });
        }

        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('Auto-Response Deleted')
            .setDescription(`Successfully removed auto-response for **${trigger}**.`)
            .setTimestamp()]
        });
      } catch (err) {
        console.error(err);
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('An error occurred while deleting the auto-response.')]
        });
      }
    }

    if (sub === 'edit') {
      const trigger = isSlash ? interaction.options.getString('trigger') : args?.[1];
      const response = isSlash ? interaction.options.getString('response') : args?.slice(2).join(' ');

      if (!trigger) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xffa500).setDescription('Please provide a trigger text.\nUsage: `!autoresponder edit <trigger> <new response>`')]
        });
      }

      if (!response) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xffa500).setDescription('Please provide a new response.\nUsage: `!autoresponder edit <trigger> <new response>`')]
        });
      }

      try {
        const result = await db('autoresponders').where({ guild_id: guildId, trigger_text: trigger }).update({ response });

        if (result === 0) {
          return interaction.reply({
            embeds: [new EmbedBuilder().setColor(0xffa500).setDescription(`No auto-response found for **${trigger}**. Use \`autoresponder create\` to add one.`)]
          });
        }

        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('Auto-Response Updated')
            .setDescription(`Successfully updated auto-response for **${trigger}**.\n**New Response:** ${response.substring(0, 1000)}${response.length > 1000 ? '...' : ''}`)
            .setTimestamp()]
        });
      } catch (err) {
        console.error(err);
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('An error occurred while editing the auto-response.')]
        });
      }
    }

    if (sub === 'list') {
      try {
        const rows = await db('autoresponders').where({ guild_id: guildId }).orderBy('id', 'asc');

        if (rows.length === 0) {
          return interaction.reply({
            embeds: [new EmbedBuilder().setColor(0x2f3136).setDescription('No auto-responses configured for this server.')]
          });
        }

        const list = rows.map(r => `**${r.trigger_text}** → ${r.response.substring(0, 80)}${r.response.length > 80 ? '...' : ''}`).join('\n');
        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(0x2f3136)
            .setTitle('Auto-Responses List')
            .setDescription(list)
            .setFooter({ text: `${rows.length} auto-response(s) total` })
            .setTimestamp()]
        });
      } catch (err) {
        console.error(err);
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('An error occurred while fetching auto-responses.')]
        });
      }
    }

    if (sub === 'reset') {
      try {
        const result = await db('autoresponders').where({ guild_id: guildId }).del();

        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('Auto-Responses Reset')
            .setDescription(`Successfully cleared all auto-responses. Removed **${result}** entry/entries.`)
            .setTimestamp()]
        });
      } catch (err) {
        console.error(err);
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('An error occurred while resetting auto-responses.')]
        });
      }
    }

    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x2f3136).setDescription('Invalid subcommand. Use `create`, `delete`, `edit`, `list`, or `reset`.')]
    });
  }
};
