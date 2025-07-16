
export async function getFriendRequests() {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch('/users/me/friend-requests', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` },
            credentials: 'include'
        });
        if (!response.ok) return [];
        const data = await response.json();
        console.log("Friend requests data:", data);
        return data; 
    } catch (error) {
        console.error("Failed to fetch friend requests:", error);
        return [];
    }
}

export async function handleFriendRequest(username: string, action: 'accept' | 'decline') {
    const token = localStorage.getItem("token");
    const response = await fetch(`/users/me/friends`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ friend: username, action: action })
    });

    if (response.ok) {
        alert(`Request from ${username} has been ${action}ed.`);
        window.location.reload(); 
    } else {
        alert(`Failed to ${action} request. Please try again.`);
    }
}