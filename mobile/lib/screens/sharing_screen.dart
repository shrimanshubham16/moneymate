import 'package:flutter/material.dart';
import '../api_client.dart';

class SharingScreen extends StatefulWidget {
  const SharingScreen({super.key, required this.api});
  final ApiClient api;

  @override
  State<SharingScreen> createState() => _SharingScreenState();
}

class _SharingScreenState extends State<SharingScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool loading = true;
  Map<String, dynamic> requests = {"incoming": [], "outgoing": []};
  Map<String, dynamic> members = {"members": [], "accounts": []};
  String? error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    load();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      requests = await widget.api.fetchSharingRequests();
      members = await widget.api.fetchSharingMembers();
    } catch (e) {
      setState(() => error = e.toString());
    } finally {
      setState(() => loading = false);
    }
  }

  Future<void> approveRequest(String id) async {
    try {
      await widget.api.approveRequest(id);
      _showSuccess('Request approved');
      await load();
    } catch (e) {
      _showError(e.toString());
    }
  }

  Future<void> rejectRequest(String id) async {
    try {
      await widget.api.rejectRequest(id);
      _showSuccess('Request rejected');
      await load();
    } catch (e) {
      _showError(e.toString());
    }
  }

  Future<void> removeMember(String memberId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove Member'),
        content: const Text('Are you sure you want to remove this member?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Remove'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await widget.api.removeMember(memberId);
        _showSuccess('Member removed');
        await load();
      } catch (e) {
        _showError(e.toString());
      }
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: Colors.red.shade700),
    );
  }

  void _showSuccess(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  void _showInviteDialog() {
    showDialog(
      context: context,
      builder: (context) => _InviteDialog(
        api: widget.api,
        onSuccess: () {
          load();
          _showSuccess('Invite sent');
        },
        onError: _showError,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sharing'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Incoming'),
            Tab(text: 'Outgoing'),
            Tab(text: 'Members'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_add),
            onPressed: _showInviteDialog,
          ),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error_outline, size: 64, color: Colors.red.shade300),
                      const SizedBox(height: 16),
                      Text('Error: $error', textAlign: TextAlign.center),
                      const SizedBox(height: 24),
                      ElevatedButton(onPressed: load, child: const Text('Retry')),
                    ],
                  ),
                )
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildIncomingRequests(),
                    _buildOutgoingRequests(),
                    _buildMembers(),
                  ],
                ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showInviteDialog,
        child: const Icon(Icons.person_add),
      ),
    );
  }

  Widget _buildIncomingRequests() {
    final incoming = requests['incoming'] as List;
    if (incoming.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inbox, size: 80, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text('No incoming requests', style: TextStyle(color: Colors.grey.shade600)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: load,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: incoming.length,
        itemBuilder: (context, index) {
          final request = incoming[index];
          return Card(
            margin: const EdgeInsets.only(bottom: 16),
            elevation: 2,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: ListTile(
              contentPadding: const EdgeInsets.all(16),
              leading: CircleAvatar(
                backgroundColor: Colors.blue.shade100,
                child: Icon(Icons.person, color: Colors.blue.shade700),
              ),
              title: Text(request['from_username'] ?? 'Unknown', style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text('Role: ${request['role'] ?? 'viewer'}\nMerge: ${request['merge_finances'] ?? false}'),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: Icon(Icons.check, color: Colors.green.shade600),
                    onPressed: () => approveRequest(request['id']),
                  ),
                  IconButton(
                    icon: Icon(Icons.close, color: Colors.red.shade600),
                    onPressed: () => rejectRequest(request['id']),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildOutgoingRequests() {
    final outgoing = requests['outgoing'] as List;
    if (outgoing.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.send, size: 80, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text('No outgoing requests', style: TextStyle(color: Colors.grey.shade600)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: load,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: outgoing.length,
        itemBuilder: (context, index) {
          final request = outgoing[index];
          return Card(
            margin: const EdgeInsets.only(bottom: 16),
            elevation: 2,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: ListTile(
              contentPadding: const EdgeInsets.all(16),
              leading: CircleAvatar(
                backgroundColor: Colors.orange.shade100,
                child: Icon(Icons.person, color: Colors.orange.shade700),
              ),
              title: Text(request['to_username'] ?? 'Unknown', style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text('Role: ${request['role'] ?? 'viewer'}\nStatus: ${request['status'] ?? 'pending'}'),
            ),
          );
        },
      ),
    );
  }

  Widget _buildMembers() {
    final membersList = members['members'] as List;
    if (membersList.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.people, size: 80, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text('No members', style: TextStyle(color: Colors.grey.shade600)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: load,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: membersList.length,
        itemBuilder: (context, index) {
          final member = membersList[index];
          return Card(
            margin: const EdgeInsets.only(bottom: 16),
            elevation: 2,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: ListTile(
              contentPadding: const EdgeInsets.all(16),
              leading: CircleAvatar(
                backgroundColor: Colors.green.shade100,
                child: Icon(Icons.person, color: Colors.green.shade700),
              ),
              title: Text(member['username'] ?? 'Unknown', style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text('Role: ${member['role'] ?? 'viewer'}'),
              trailing: IconButton(
                icon: Icon(Icons.remove_circle, color: Colors.red.shade400),
                onPressed: () => removeMember(member['user_id']),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _InviteDialog extends StatefulWidget {
  const _InviteDialog({
    required this.api,
    required this.onSuccess,
    required this.onError,
  });
  final ApiClient api;
  final VoidCallback onSuccess;
  final Function(String) onError;

  @override
  State<_InviteDialog> createState() => _InviteDialogState();
}

class _InviteDialogState extends State<_InviteDialog> {
  final usernameCtrl = TextEditingController();
  String role = 'viewer';
  bool merge = false;
  bool loading = false;

  Future<void> submit() async {
    if (usernameCtrl.text.isEmpty) {
      widget.onError('Please enter username');
      return;
    }

    setState(() => loading = true);
    try {
      await widget.api.sendInvite(usernameCtrl.text, role, merge);
      if (mounted) {
        Navigator.of(context).pop();
        widget.onSuccess();
      }
    } catch (e) {
      setState(() => loading = false);
      widget.onError(e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Send Invite'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: usernameCtrl,
              decoration: const InputDecoration(labelText: 'Username'),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: role,
              decoration: const InputDecoration(labelText: 'Role'),
              items: const [
                DropdownMenuItem(value: 'viewer', child: Text('Viewer')),
                DropdownMenuItem(value: 'editor', child: Text('Editor')),
              ],
              onChanged: (value) => setState(() => role = value!),
            ),
            const SizedBox(height: 16),
            CheckboxListTile(
              title: const Text('Merge Finances'),
              value: merge,
              onChanged: (value) => setState(() => merge = value!),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: loading ? null : submit,
          child: loading
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Send'),
        ),
      ],
    );
  }
}
