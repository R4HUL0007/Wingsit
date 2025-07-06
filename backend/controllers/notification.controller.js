import Notification from "../models/notification.model.js";

export const getNotifications = async  (req, res )=> {

    try{
        const userId = req.user._id;

        const notifications = await Notification.find({ to: userId }).populate({
            path: "from",
            select: "username profileImg"

        })
        await Notification.updateMany({ to: userId}, {read : true});
        res.status(200).json(notifications);

    }catch(error){
        console.log("Error in getNotifications Function", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export const deleteNotifications = async (req, res ) => {
    
        try {
            const userId = req.user._id;
    
            await Notification.deleteMany({ to: userId });
    
            res.status(200).json({ message: "Notifications deleted successfully" });
        } catch (error) {
            console.log("Error in deleteNotifications function", error.message);
            res.status(500).json({ error: "Internal Server Error" });
        }
    
};

//for single notification deletion

// export const deleteNotification = async (req, res ) => {
//     try {
//         const noticationId = req.param.id;
//         const userId = req.user._id;

//         const notification = await Notification.findById(noticationId);

//         if (!notification) {
//             return res.status(404).json({ message: "Notification not found" });
//         }

//         if (notification.to.toString() !== userId.toString()){
//             return res.status(403).json({ message: "You are not authorized to delete this notification"});
//         }
//         await Notification.findByIdAndDelete(noticationId);
//         res.status(200).json({ message: "Notification deleted successfully" });

//     }catch (error) {
//         console.log("Error in deleteNotification function", error.message);
//         res.status(500).json({ error: "Internal Server Error" });
//     }

    
// }

export const getUnreadNotificationCount = async (req, res) => {
  try {
    const myId = req.user._id;
    const count = await Notification.countDocuments({ to: myId, read: false });
    res.status(200).json({ count });
  } catch (error) {
    console.log('Error in getUnreadNotificationCount:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getUnreadNotificationCountForUser = async (req, res) => {
  try {
    const myId = req.user._id;
    const { userId } = req.params;
    
    console.log(`Getting notification count from user ${userId} to user ${myId}`);
    
    // Count notifications from this specific user that are unread
    const count = await Notification.countDocuments({ 
      from: userId, 
      to: myId, 
      read: false 
    });
    
    console.log(`Found ${count} unread notifications from user ${userId}`);
    res.status(200).json({ count });
  } catch (error) {
    console.log('Error in getUnreadNotificationCountForUser:', error);
    res.status(500).json({ error: error.message });
  }
};

export const markNotificationsAsReadForUser = async (req, res) => {
  try {
    const myId = req.user._id;
    const { userId } = req.params;
    
    console.log(`Marking notifications as read from user ${userId} to user ${myId}`);
    
    // Mark all notifications from this specific user as read
    const result = await Notification.updateMany(
      { 
        from: userId, 
        to: myId, 
        read: false 
      },
      { 
        read: true 
      }
    );
    
    console.log(`Marked ${result.modifiedCount} notifications as read from user ${userId}`);
    res.status(200).json({ message: 'Notifications marked as read', count: result.modifiedCount });
  } catch (error) {
    console.log('Error in markNotificationsAsReadForUser:', error);
    res.status(500).json({ error: error.message });
  }
};